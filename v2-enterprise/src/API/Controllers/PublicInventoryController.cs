using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CarShowroomManagementV2.Application.Inventory.Queries;

namespace CarShowroomManagementV2.API.Controllers
{
    [AllowAnonymous]
    [Route("api/public/inventory")]
    public sealed class PublicInventoryController : ApiControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery(Name = "per_page")] int perPage = 25,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (perPage < 1 || perPage > 100) perPage = 25;

            var result = await Mediator.Send(new GetPublicVehiclesQuery
            {
                Page = page,
                PerPage = perPage,
                Search = search
            });

            return Ok(new
            {
                success = true,
                data = new
                {
                    total = result.Total,
                    page = result.Page,
                    per_page = result.PerPage,
                    items = result.Items.Select(MapVehicle)
                }
            });
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetDetails(Guid id)
        {
            var vehicle = await Mediator.Send(new GetPublicVehicleDetailsQuery { VehicleId = id });
            return vehicle is null
                ? NotFound(new { success = false, message = "السيارة غير متوفرة حالياً." })
                : Ok(new { success = true, data = MapVehicle(vehicle) });
        }

        private static object MapVehicle(PublicVehicleDto vehicle)
        {
            var photos = vehicle.Photos.Select(MapPhoto).ToList();
            return new
            {
                id = vehicle.Id,
                branch_id = vehicle.BranchId,
                brand = vehicle.Brand,
                model = vehicle.Model,
                manufacturing_year = vehicle.Year,
                trim = (string?)null,
                condition = "Used",
                color = vehicle.Color,
                vin = string.Empty,
                plate_number = string.Empty,
                plate_status = (string?)null,
                mileage = (int?)null,
                engine_size = (string?)null,
                cylinders = (int?)null,
                transmission = (string?)null,
                fuel_type = (string?)null,
                import_country = (string?)null,
                seat_count = (int?)null,
                seat_material = (string?)null,
                purchase_price = 0,
                selling_price = vehicle.SellingPrice,
                currency = "IQD",
                status = vehicle.Status,
                notes = (string?)null,
                created_at = vehicle.CreatedAt,
                photos,
                cover_photo = photos.FirstOrDefault()
            };
        }

        private static object MapVehicle(PublicVehicleDetailsDto vehicle)
        {
            var photos = vehicle.Photos.Select(MapPhoto).ToList();
            return new
            {
                id = vehicle.Id,
                branch_id = vehicle.BranchId,
                brand = vehicle.Brand,
                model = vehicle.Model,
                manufacturing_year = vehicle.Year,
                trim = (string?)null,
                condition = "Used",
                color = vehicle.Color,
                vin = string.Empty,
                plate_number = string.Empty,
                plate_status = (string?)null,
                mileage = (int?)null,
                engine_size = (string?)null,
                cylinders = (int?)null,
                transmission = (string?)null,
                fuel_type = (string?)null,
                import_country = (string?)null,
                seat_count = (int?)null,
                seat_material = (string?)null,
                purchase_price = 0,
                selling_price = vehicle.SellingPrice,
                currency = "IQD",
                status = vehicle.Status,
                notes = (string?)null,
                created_at = vehicle.CreatedAt,
                photos,
                cover_photo = photos.FirstOrDefault()
            };
        }

        private static object MapPhoto(PublicVehiclePhotoDto photo) => new
        {
            id = photo.Id,
            filename = photo.FileName,
            subfolder = "vehicles"
        };
    }
}
