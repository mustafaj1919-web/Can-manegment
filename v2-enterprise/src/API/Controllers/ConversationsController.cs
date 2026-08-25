using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CarShowroomManagementV2.API.Controllers
{
    // محادثات تطبيق الموبايل حول السيارات: العميل يرى محادثاته فقط،
    // بينما "المدير" (عميل باسم يطابق كلمات مفتاحية إدارية) يرى كل المحادثات ويرد عليها.
    [Authorize]
    public sealed class ConversationsController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;

        public ConversationsController(IApplicationDbContext context)
        {
            _context = context;
        }

        // GET /api/conversations
        [HttpGet]
        public async Task<IActionResult> GetConversations()
        {
            var (customerId, appUserId, isManager, _) = await ResolveCurrentUserAsync();
            if (customerId == null && appUserId == null)
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var query = _context.Conversations
                .IgnoreQueryFilters()
                .Include(c => c.Vehicle)
                .Include(c => c.Customer)
                .Include(c => c.AppUser)
                .Include(c => c.Messages)
                .AsQueryable();

            if (!isManager)
            {
                query = query.Where(c =>
                    (customerId != null && c.CustomerId == customerId) ||
                    (appUserId != null && c.AppUserId == appUserId));
            }

            var conversations = await query
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            var otherSenderType = isManager ? "Customer" : "Admin";
            var result = conversations.Select(c =>
            {
                var lastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                var unread = c.Messages.Count(m => !m.IsRead && m.SenderType == otherSenderType);
                return new
                {
                    id = c.Id,
                    vehicle = c.Vehicle == null ? null : new
                    {
                        id = c.Vehicle.Id,
                        brand = c.Vehicle.Brand,
                        model = c.Vehicle.Model,
                        year = c.Vehicle.Year
                    },
                    customerName = isManager
                        ? (c.Customer != null ? (c.Customer.FullName ?? c.Customer.Name) : c.AppUser?.Name ?? "زائر")
                        : null,
                    lastMessage = lastMessage?.Body,
                    lastMessageAt = c.LastMessageAt,
                    unreadCount = unread
                };
            });

            return Ok(new { success = true, data = result });
        }

        // POST /api/conversations  { vehicleId }
        [HttpPost]
        public async Task<IActionResult> StartConversation([FromBody] StartConversationRequest request)
        {
            var (customerId, appUserId, _, _) = await ResolveCurrentUserAsync();
            if (customerId == null && appUserId == null)
            {
                return Unauthorized(new { success = false, message = "غير مصرح." });
            }

            var vehicleExists = await _context.Vehicles
                .IgnoreQueryFilters()
                .AnyAsync(v => v.Id == request.VehicleId);
            if (!vehicleExists)
            {
                return NotFound(new { success = false, message = "السيارة غير موجودة." });
            }

            var conversation = await _context.Conversations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.VehicleId == request.VehicleId &&
                    ((customerId != null && c.CustomerId == customerId) ||
                     (appUserId != null && c.AppUserId == appUserId)));

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    VehicleId = request.VehicleId,
                    CustomerId = customerId,
                    AppUserId = appUserId
                };
                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, data = new { id = conversation.Id } });
        }

        // GET /api/conversations/{id}/messages
        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(Guid id)
        {
            var (customerId, appUserId, isManager, _) = await ResolveCurrentUserAsync();
            var conversation = await _context.Conversations
                .IgnoreQueryFilters()
                .Include(c => c.Vehicle)
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                return NotFound(new { success = false, message = "المحادثة غير موجودة." });
            }

            var isOwner = (customerId != null && conversation.CustomerId == customerId) ||
                          (appUserId != null && conversation.AppUserId == appUserId);
            if (!isOwner && !isManager)
            {
                return Unauthorized(new { success = false, message = "غير مصرح بعرض هذه المحادثة." });
            }

            var otherSenderType = isManager ? "Customer" : "Admin";
            var unreadFromOther = conversation.Messages
                .Where(m => !m.IsRead && m.SenderType == otherSenderType)
                .ToList();
            if (unreadFromOther.Count > 0)
            {
                foreach (var m in unreadFromOther)
                {
                    m.IsRead = true;
                }
                await _context.SaveChangesAsync();
            }

            var messages = conversation.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    id = m.Id,
                    senderType = m.SenderType,
                    senderName = m.SenderName,
                    body = m.Body,
                    createdAt = m.CreatedAt
                });

            return Ok(new
            {
                success = true,
                data = new
                {
                    vehicle = conversation.Vehicle == null ? null : new
                    {
                        brand = conversation.Vehicle.Brand,
                        model = conversation.Vehicle.Model,
                        year = conversation.Vehicle.Year
                    },
                    messages
                }
            });
        }

        // POST /api/conversations/{id}/messages  { text }
        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest(new { success = false, message = "نص الرسالة مطلوب." });
            }

            var (customerId, appUserId, isManager, displayName) = await ResolveCurrentUserAsync();
            var conversation = await _context.Conversations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null)
            {
                return NotFound(new { success = false, message = "المحادثة غير موجودة." });
            }

            var isOwner = (customerId != null && conversation.CustomerId == customerId) ||
                          (appUserId != null && conversation.AppUserId == appUserId);
            if (!isOwner && !isManager)
            {
                return Unauthorized(new { success = false, message = "غير مصرح بالرد على هذه المحادثة." });
            }

            var message = new Message
            {
                ConversationId = id,
                SenderType = isOwner ? "Customer" : "Admin",
                SenderName = isOwner ? displayName : "إدارة المعرض",
                Body = request.Text.Trim()
            };
            _context.Messages.Add(message);
            conversation.LastMessageAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = message.Id,
                    senderType = message.SenderType,
                    senderName = message.SenderName,
                    body = message.Body,
                    createdAt = message.CreatedAt
                }
            });
        }

        private async Task<(Guid? customerId, Guid? appUserId, bool isManager, string displayName)> ResolveCurrentUserAsync()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var id))
            {
                return (null, null, false, string.Empty);
            }

            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id);
            if (customer != null)
            {
                var name = (customer.FullName ?? customer.Name).ToLowerInvariant();
                var isManager = name.Contains("مدير") || name.Contains("admin") ||
                                 name.Contains("owner") || name.Contains("شريك");
                return (customer.Id, null, isManager, customer.FullName ?? customer.Name);
            }

            var appUser = await _context.AppUsers.FirstOrDefaultAsync(u => u.Id == id);
            if (appUser != null)
            {
                return (null, appUser.Id, false, appUser.Name);
            }

            return (null, null, false, string.Empty);
        }
    }

    public class StartConversationRequest
    {
        public Guid VehicleId { get; set; }
    }

    public class SendMessageRequest
    {
        public string Text { get; set; } = string.Empty;
    }
}
