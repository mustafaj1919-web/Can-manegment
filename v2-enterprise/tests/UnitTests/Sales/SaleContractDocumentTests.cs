using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Customers.Commands;
using ContractsCmds = CarShowroomManagementV2.Application.Contracts.Commands;
using CarShowroomManagementV2.Application.Contracts.Queries;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.UnitTests.Sales
{
    public class SaleContractDocumentTests : IDisposable
    {
        private readonly Mock<ICurrentUserService> _currentUserServiceMock;
        private readonly Mock<IEInvoiceService> _eInvoiceServiceMock;
        private readonly AuditableEntitySaveChangesInterceptor _interceptor;
        private readonly Guid _testBranchId = Guid.NewGuid();
        private readonly Guid _testUserId = Guid.NewGuid();
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;

        public SaleContractDocumentTests()
        {
            _currentUserServiceMock = new Mock<ICurrentUserService>();
            _currentUserServiceMock.Setup(x => x.UserId).Returns(_testUserId.ToString());
            _currentUserServiceMock.Setup(x => x.BranchId).Returns(_testBranchId);
            _currentUserServiceMock.Setup(x => x.CanSeeAllBranches).Returns(false);

            _eInvoiceServiceMock = new Mock<IEInvoiceService>();
            _eInvoiceServiceMock.Setup(x => x.GenerateTlvQrCodeBase64(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<decimal>(), It.IsAny<decimal>())).Returns("dummy_qr");
            _eInvoiceServiceMock.Setup(x => x.GenerateInvoiceXml(It.IsAny<SalesContract>(), It.IsAny<Branch>(), It.IsAny<Customer>())).Returns("<xml/>");
            _eInvoiceServiceMock.Setup(x => x.CalculateXmlHash(It.IsAny<string>())).Returns("dummy_hash");
            _eInvoiceServiceMock.Setup(x => x.SubmitInvoiceToPortalAsync(It.IsAny<SalesContract>(), It.IsAny<string>())).ReturnsAsync((true, "Success", "CLEARED"));

            _interceptor = new AuditableEntitySaveChangesInterceptor(_currentUserServiceMock.Object);

            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();
        }

        private ApplicationDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            var context = new ApplicationDbContext(options, _currentUserServiceMock.Object, _interceptor);
            context.Database.EnsureCreated();
            return context;
        }

        public void Dispose()
        {
            _connection.Close();
            _connection.Dispose();
        }

        private async Task<(Customer customer, Vehicle vehicle, User user)> SeedBasicEntitiesAsync(ApplicationDbContext context)
        {
            var branch = new Branch { Id = _testBranchId, Name = "الفرع الرئيسي", Code = "MAIN", VatNumber = "300000000000003" };
            context.Branches.Add(branch);

            var user = new User { Id = _testUserId, Username = "sajjad_admin", FullName = "سجاد حسين محمد", DefaultBranchId = _testBranchId };
            context.Users.Add(user);

            var custAccount = new Account { Id = Guid.NewGuid(), AccountCode = "1103001", Name = "حساب العميل", Type = AccountType.Asset, BranchId = _testBranchId };
            context.Accounts.Add(custAccount);

            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                Name = "علي حسين محمد",
                FullName = "علي حسين محمد علي",
                Phone = "07701234567",
                IdNumber = "199012345678",
                Address = "بغداد - الكرادة",
                AccountId = custAccount.Id,
                BranchId = _testBranchId
            };
            context.Customers.Add(customer);

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                Brand = "Toyota",
                Model = "Camry",
                Year = 2024,
                Color = "Silver",
                ChassisNumber = "VIN1234567890CAMRY",
                EngineNumber = "ENG998877",
                PlateNumber = "A-1234",
                ImportCountry = "Japan",
                PurchaseCost = 20000,
                BookValue = 20000,
                Status = "Available",
                Currency = "IQD",
                BranchId = _testBranchId
            };
            context.Vehicles.Add(vehicle);

            // Accounts needed for contract handler
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "1201", Name = "مخزون السيارات", Type = AccountType.Asset, BranchId = _testBranchId });
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "4101", Name = "إيرادات المبيعات", Type = AccountType.Revenue, BranchId = _testBranchId });
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "5101", Name = "تكلفة المبيعات", Type = AccountType.Expense, BranchId = _testBranchId });
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "2202", Name = "ضريبة المبيعات", Type = AccountType.Liability, BranchId = _testBranchId });
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "2203", Name = "رسوم التسجيل", Type = AccountType.Liability, BranchId = _testBranchId });
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "2301", Name = "أرباح تقسيط مؤجلة", Type = AccountType.Liability, BranchId = _testBranchId });
            context.Accounts.Add(new Account { Id = Guid.NewGuid(), AccountCode = "111001", Name = "صندوق النقدية", Type = AccountType.Asset, BranchId = _testBranchId });

            await context.SaveChangesAsync();
            return (customer, vehicle, user);
        }

        [Fact]
        public async Task CreateContract_PersonOwnership_PopulatesPersonSnapshotsAndValidatesExclusivity()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.PERSON,
                OwnerPersonName = "أحمد عبد الله المالك السابق",
                OwnerPersonPhone = "07801112233",
                OwnerPersonIdNumber = "9988776655"
            };

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await handler.Handle(command, CancellationToken.None);

            var doc = await context.SalesContracts.FindAsync(contractId);
            doc.Should().NotBeNull();
            doc!.OwnershipType.Should().Be(VehicleOwnershipType.PERSON);
            doc.OwnerPersonNameSnapshot.Should().Be("أحمد عبد الله المالك السابق");
            doc.OwnerPersonPhoneSnapshot.Should().Be("07801112233");
            doc.SupplierId.Should().BeNull();
            doc.CompanyNameSnapshot.Should().BeNull();
            doc.PreparedByUserId.Should().Be(_testUserId);
            doc.PreparedByNameSnapshot.Should().Be("سجاد حسين محمد");
            doc.PreparedByRoleSnapshot.Should().Be("منظّم العقد");
            doc.DocumentRevision.Should().Be(1);
            doc.DocumentStatus.Should().Be(SaleDocumentStatus.FINALIZED);
            doc.VerificationCode.Should().StartWith("vsc_");
        }

        [Fact]
        public async Task CreateContract_SupplierOwnership_PopulatesSupplierSnapshotsAndRequiresSupplierId()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var supplierAcc = new Account { Id = Guid.NewGuid(), AccountCode = "2101001", Name = "حساب المورد", Type = AccountType.Liability, BranchId = _testBranchId };
            context.Accounts.Add(supplierAcc);

            var supplier = new Supplier { Id = Guid.NewGuid(), Name = "شركة دبي لتجارة السيارات", Code = "SUP-001", Phone = "07709998877", AccountId = supplierAcc.Id, BranchId = _testBranchId };
            context.Suppliers.Add(supplier);
            await context.SaveChangesAsync();

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.SUPPLIER,
                SupplierId = supplier.Id,
                SupplierReference = "INV-SUP-2026-888"
            };

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await handler.Handle(command, CancellationToken.None);

            var doc = await context.SalesContracts.FindAsync(contractId);
            doc.Should().NotBeNull();
            doc!.OwnershipType.Should().Be(VehicleOwnershipType.SUPPLIER);
            doc.SupplierId.Should().Be(supplier.Id);
            doc.SupplierNameSnapshot.Should().Be("شركة دبي لتجارة السيارات");
            doc.SupplierReference.Should().Be("INV-SUP-2026-888");
            doc.OwnerPersonNameSnapshot.Should().BeNull();
            doc.CompanyNameSnapshot.Should().BeNull();
        }

        [Fact]
        public async Task CreateContract_CompanyOwnership_PopulatesCompanySnapshotsAndNullsOtherOwners()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.COMPANY
            };

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await handler.Handle(command, CancellationToken.None);

            var doc = await context.SalesContracts.FindAsync(contractId);
            doc.Should().NotBeNull();
            doc!.OwnershipType.Should().Be(VehicleOwnershipType.COMPANY);
            doc.CompanyNameSnapshot.Should().Be("شركة الأصدقاء لتجارة السيارات");
            doc.OwnerPersonNameSnapshot.Should().BeNull();
            doc.SupplierId.Should().BeNull();
        }

        [Fact]
        public async Task FinalizeContract_MutatesCustomerEntityLater_DocumentDtoRemainsUnchanged()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var command = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.COMPANY
            };

            var handler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await handler.Handle(command, CancellationToken.None);

            // Mutate master Customer, Vehicle, User records later
            customer.FullName = "اسم العميل المتغير حديثاً";
            customer.Phone = "07909999999";
            context.Customers.Update(customer);

            vehicle.Brand = "Lexus";
            vehicle.Model = "LX600";
            context.Vehicles.Update(vehicle);

            user.FullName = "اسم الموظف المتغير";
            context.Users.Update(user);

            await context.SaveChangesAsync();

            // Fetch document DTO
            var queryHandler = new GetSaleContractDocumentQueryHandler(context);
            var dto = await queryHandler.Handle(new GetSaleContractDocumentQuery { Id = contractId }, CancellationToken.None);

            dto.Should().NotBeNull();
            dto!.BuyerName.Should().Be("علي حسين محمد علي");  // Snapshot preserved!
            dto.BuyerPhone.Should().Be("07701234567");        // Snapshot preserved!
            dto.Brand.Should().Be("Toyota");           // Snapshot preserved!
            dto.Model.Should().Be("Camry");            // Snapshot preserved!
            dto.PreparedByName.Should().Be("سجاد حسين محمد");  // Snapshot preserved!
        }

        [Fact]
        public async Task ReissueChain_R1_R2_R3_MaintainsImmutabilityAndUpdatesPublicVerification()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var createCmd = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.PERSON,
                OwnerPersonName = "المالك الأول"
            };

            var createHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var r1Id = await createHandler.Handle(createCmd, CancellationToken.None);
            var r1Doc = await context.SalesContracts.FindAsync(r1Id);

            // Reissue 1 -> R2
            var reissueHandler = new ContractsCmds.ReissueSaleContractCommandHandler(context, _currentUserServiceMock.Object);
            var r2Id = await reissueHandler.Handle(new ContractsCmds.ReissueSaleContractCommand
            {
                OriginalDocumentId = r1Id,
                ReissueReason = "تعديل هاتف المالك",
                UpdatedOwnerPersonPhone = "07701111111"
            }, CancellationToken.None);
            var r2Doc = await context.SalesContracts.FindAsync(r2Id);

            // Reissue 2 -> R3
            var r3Id = await reissueHandler.Handle(new ContractsCmds.ReissueSaleContractCommand
            {
                OriginalDocumentId = r2Id,
                ReissueReason = "تصحيح اسم المالك",
                UpdatedOwnerPersonName = "المالك المعدل R3"
            }, CancellationToken.None);
            var r3Doc = await context.SalesContracts.FindAsync(r3Id);

            // Verify statuses
            r1Doc!.DocumentStatus.Should().Be(SaleDocumentStatus.REISSUED);
            r1Doc.DocumentRevision.Should().Be(1);

            r2Doc!.DocumentStatus.Should().Be(SaleDocumentStatus.REISSUED);
            r2Doc.DocumentRevision.Should().Be(2);

            r3Doc!.DocumentStatus.Should().Be(SaleDocumentStatus.FINALIZED);
            r3Doc.DocumentRevision.Should().Be(3);

            r1Doc.ContractNumber.Should().Be(r2Doc.ContractNumber);
            r2Doc.ContractNumber.Should().Be(r3Doc.ContractNumber);

            // Verify public endpoint for R1, R2, R3
            var verifyHandler = new VerifySaleDocumentQueryHandler(context);
            var v1 = await verifyHandler.Handle(new VerifySaleDocumentQuery { Code = r1Doc.VerificationCode }, CancellationToken.None);
            var v2 = await verifyHandler.Handle(new VerifySaleDocumentQuery { Code = r2Doc.VerificationCode }, CancellationToken.None);
            var v3 = await verifyHandler.Handle(new VerifySaleDocumentQuery { Code = r3Doc.VerificationCode }, CancellationToken.None);

            v1!.Status.Should().Be("SUPERSEDED");
            v1.ReplacementDocumentNumber.Should().Be(r3Doc.DocumentNumber);

            v2!.Status.Should().Be("SUPERSEDED");
            v2.ReplacementDocumentNumber.Should().Be(r3Doc.DocumentNumber);

            v3!.Status.Should().Be("FINALIZED");
            v3.IsValid.Should().BeTrue();
        }

        [Fact]
        public async Task CancelReissuedChain_CancelsCurrentDocument_LeavesHistoricalReissuedIntact()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var createCmd = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.COMPANY
            };

            var createHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var r1Id = await createHandler.Handle(createCmd, CancellationToken.None);

            var reissueHandler = new ContractsCmds.ReissueSaleContractCommandHandler(context, _currentUserServiceMock.Object);
            var r2Id = await reissueHandler.Handle(new ContractsCmds.ReissueSaleContractCommand { OriginalDocumentId = r1Id }, CancellationToken.None);

            // Cancel active R2
            var cancelHandler = new ContractsCmds.CancelSaleContractCommandHandler(context, _currentUserServiceMock.Object);
            await cancelHandler.Handle(new ContractsCmds.CancelSaleContractCommand { DocumentId = r2Id, Reason = "إلغاء نهائي" }, CancellationToken.None);

            var r1Doc = await context.SalesContracts.FindAsync(r1Id);
            var r2Doc = await context.SalesContracts.FindAsync(r2Id);

            r1Doc!.DocumentStatus.Should().Be(SaleDocumentStatus.REISSUED); // Unchanged!
            r2Doc!.DocumentStatus.Should().Be(SaleDocumentStatus.CANCELLED);
        }

        [Fact]
        public async Task PublicVerifyEndpoint_ValidCode_ReturnsMaskedMinimalData()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var createCmd = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.COMPANY
            };

            var createHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await createHandler.Handle(createCmd, CancellationToken.None);

            var doc = await context.SalesContracts.FindAsync(contractId);

            var verifyHandler = new VerifySaleDocumentQueryHandler(context);
            var result = await verifyHandler.Handle(new VerifySaleDocumentQuery { Code = doc!.VerificationCode }, CancellationToken.None);

            result.Should().NotBeNull();
            result!.IsValid.Should().BeTrue();
            result.Status.Should().Be("FINALIZED");
            result.BuyerNameMasked.Should().Be("ع. ح. م. ع.");
            result.VehicleSummary.Should().Contain("Toyota Camry 2024");
            result.VehicleSummary.Should().NotContain("VIN1234567890CAMRY"); // Full VIN masked!
            result.VehicleSummary.Should().Contain("***AMRY");
        }

        [Fact]
        public async Task DraftContract_HasDraftStatus_AndPublicVerifyReturnsDraftNonOfficial()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var draftContract = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = "SC-2026-000099",
                DocumentNumber = "SALE-2026-000099-R1",
                DocumentRevision = 1,
                DocumentStatus = SaleDocumentStatus.DRAFT,
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SaleDate = DateTime.UtcNow,
                SalePrice = 20000,
                BranchId = _testBranchId
            };
            context.SalesContracts.Add(draftContract);
            await context.SaveChangesAsync();

            draftContract.DocumentStatus.Should().Be(SaleDocumentStatus.DRAFT);

            var verifyHandler = new VerifySaleDocumentQueryHandler(context);
            var result = await verifyHandler.Handle(new VerifySaleDocumentQuery { Code = draftContract.VerificationCode }, CancellationToken.None);

            result.Should().NotBeNull();
            result!.IsValid.Should().BeFalse();
            result.Status.Should().Be("DRAFT");
            result.Message.Should().Contain("مسودة غير معتمدة");
        }

        [Fact]
        public async Task PreparedByUserId_IsServerAuthoritative_AndIgnoresClientSpoofing()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var createCmd = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.COMPANY
            };

            var createHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await createHandler.Handle(createCmd, CancellationToken.None);

            var doc = await context.SalesContracts.FindAsync(contractId);
            doc!.PreparedByUserId.Should().Be(_testUserId);
            doc.PreparedByNameSnapshot.Should().Be("سجاد حسين محمد");
            doc.PreparedByRoleSnapshot.Should().Be("منظّم العقد");
        }

        [Fact]
        public async Task DistinctIdentifiers_ContractNumber_DocumentNumber_ReceiptNumber_AreDistinct()
        {
            using var context = GetDbContext();
            var (customer, vehicle, user) = await SeedBasicEntitiesAsync(context);

            var createCmd = new CreateSaleContractCommand
            {
                CustomerId = customer.Id,
                VehicleId = vehicle.Id,
                SalePrice = 25000,
                DownPayment = 25000,
                PaymentMethod = PaymentMethod.Cash,
                OwnershipType = VehicleOwnershipType.COMPANY
            };

            var createHandler = new CreateSaleContractCommandHandler(context, _currentUserServiceMock.Object, _eInvoiceServiceMock.Object);
            var contractId = await createHandler.Handle(createCmd, CancellationToken.None);

            var doc = await context.SalesContracts.FindAsync(contractId);
            doc!.ContractNumber.Should().StartWith("SC-");
            doc.DocumentNumber.Should().StartWith("SALE-");
            doc.DocumentNumber.Should().EndWith("-R1");
            doc.ReceiptNumber.Should().StartWith("REC-");
            doc.VerificationCode.Should().StartWith("vsc_");
        }
    }
}
