import type { User, UserRole } from "../types/auth";
import type { Client, Contact } from "../types/client";
import type { Parameter, Protocol, SampleType, Matrix } from "../types/parameter";
import type { Quote } from "../types/quote";
import type { Order } from "../types/order";
import type { Sample, Analysis } from "../types/sample";

export type { User, UserRole, Client, Contact, Parameter, Protocol, SampleType, Matrix, Quote, Order, Sample, Analysis };

export const mockClients: Client[] = [
    // PUBLIC CLIENTS - Có thể xem bởi tất cả Sales/CustomerService
    {
        clientId: "ANL_001",
        clientName: "Công ty TNHH Môi trường Xanh",
        legalId: "0123456789",
        clientAddress: "123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM",
        invoiceInfo: "Công ty TNHH Môi trường Xanh - MST: 0123456789",
        clientSaleScope: "public",
        availableByIds: [], // Public nên không giới hạn
        totalOrderAmount: 15750000,
        lastOrder: "2024-12-15",
        contacts: [
            { name: "Nguyễn Thị Lan Anh", email: "lananh@moitruongxanh.vn" },
            { name: "Trần Minh Tuấn", email: "minhtuan@moitruongxanh.vn" },
        ],
        invoiceEmail: "lananh@moitruongxanh.vn", // Added from invoiceEmail
        createdAt: "2024-01-01",
        createdById: "2", // kd001
    },
    {
        clientId: "ANL_002",
        clientName: "Nhà máy Chế biến Thực phẩm Hải Sản Việt",
        legalId: "0198765432",
        clientAddress: "456 Xa lộ Hà Nội, Phường Thảo Điền, TP. Thủ Đức, TP. HCM",
        invoiceInfo: "Nhà máy Chế biến Thực phẩm Hải Sản Việt - MST: 0198765432",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 28900000,
        lastOrder: "2024-12-20",
        contacts: [
            { name: "Lê Văn Hùng", email: "hung.lv@haisanviet.com.vn" },
            { name: "Phạm Thị Mai", email: "mai.pt@haisanviet.com.vn" },
        ],
        invoiceEmail: "ketoan@haisanviet.com.vn",
        createdAt: "2024-01-01",
        createdById: "2",
    },
    {
        clientId: "ANL_003",
        clientName: "Tập đoàn Công nghiệp Hoá chất Việt Nam",
        legalId: "0145678901",
        clientAddress: "789 Đường Nguyễn Văn Linh, Phường Tân Phú, Quận 7, TP. HCM",
        invoiceInfo: "Tập đoàn Công nghiệp Hoá chất Việt Nam - MST: 0145678901",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 52300000,
        lastOrder: "2024-12-25",
        contacts: [
            { name: "Hoàng Quốc Việt", email: "viet.hq@vietchemical.vn" },
            { name: "Đặng Thu Hương", email: "huong.dt@vietchemical.vn" },
            { name: "Vũ Minh Khải", email: "khai.vm@vietchemical.vn" },
        ],
        invoiceEmail: "invoice@vietchemical.vn",
        createdAt: "2024-01-01",
        createdById: "6", // kd002
    },
    {
        clientId: "ANL_004",
        clientName: "Công ty Cổ phần Nước sạch Đông Nam Á",
        legalId: "0167890123",
        clientAddress: "321 Võ Văn Kiệt, Phường Cầu Kho, Quận 1, TP. HCM",
        invoiceInfo: "Công ty Cổ phần Nước sạch Đông Nam Á - MST: 0167890123",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 41200000,
        lastOrder: "2024-12-18",
        contacts: [{ name: "Bùi Thị Ngọc", email: "ngoc.bt@seawater.com.vn" }],
        invoiceEmail: "finance@seawater.com.vn",
        createdAt: "2024-01-01",
        createdById: "2",
    },
    {
        clientId: "ANL_005",
        clientName: "Công ty TNHH Dược phẩm Thiên Nhiên",
        legalId: "0189012345",
        clientAddress: "555 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP. HCM",
        invoiceInfo: "Công ty TNHH Dược phẩm Thiên Nhiên - MST: 0189012345",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 19800000,
        lastOrder: "2024-12-10",
        contacts: [
            { name: "Trịnh Văn Nam", email: "nam.tv@naturalpharma.vn" },
            { name: "Ngô Thị Bích", email: "bich.nt@naturalpharma.vn" },
        ],
        invoiceEmail: "accounting@naturalpharma.vn",
        createdAt: "2024-01-01",
        createdById: "6",
    },

    // PRIVATE CLIENTS - Chỉ người được chỉ định mới xem được
    {
        clientId: "ANL_006",
        clientName: "Cơ sở Sản xuất Nước tinh khiết Minh Châu",
        legalId: "8765432109",
        clientAddress: "88 Đường 3 Tháng 2, Phường 11, Quận 10, TP. HCM",
        invoiceInfo: "Cơ sở Sản xuất Nước tinh khiết Minh Châu - MST: 8765432109",
        clientSaleScope: "private",
        availableByIds: ["1"], // Chỉ ctv001 được xem
        totalOrderAmount: 3200000,
        lastOrder: "2024-12-05",
        contacts: [{ name: "Lý Minh Châu", email: "minhchau88@gmail.com" }],
        invoiceEmail: "minhchau@gmail.com",
        createdAt: "2024-01-01",
        createdById: "1", // ctv001
    },
    {
        clientId: "ANL_007",
        clientName: "Xưởng Mạ điện Tân Phát",
        legalId: "5432167890",
        clientAddress: "234 Quốc lộ 1A, Phường Bình Hưng Hòa, Quận Bình Tân, TP. HCM",
        invoiceInfo: "Xưởng Mạ điện Tân Phát - MST: 5432167890",
        clientSaleScope: "private",
        availableByIds: ["1"], // Chỉ ctv001 được xem
        totalOrderAmount: 5600000,
        lastOrder: "2024-12-08",
        contacts: [{ name: "Nguyễn Văn Phát", email: "phat.nv@tanphat.com" }],
        invoiceEmail: "tanphat.plating@yahoo.com",
        createdAt: "2024-01-01",
        createdById: "1", // ctv001
    },
    {
        clientId: "ANL_008",
        clientName: "Công ty TNHH Thực phẩm Organic An Lạc",
        legalId: "3216549870",
        clientAddress: "77 Phan Văn Trị, Phường 10, Quận Gò Vấp, TP. HCM",
        invoiceInfo: "Công ty TNHH Thực phẩm Organic An Lạc - MST: 3216549870",
        clientSaleScope: "private",
        availableByIds: ["5"], // Chỉ ctv002 được xem
        totalOrderAmount: 8400000,
        lastOrder: "2024-12-12",
        contacts: [
            { name: "Võ Thị An", email: "an.vt@anlacorganic.vn" },
            { name: "Đoàn Minh Lạc", email: "lac.dm@anlacorganic.vn" },
        ],
        invoiceEmail: "info@anlacorganic.vn",
        createdAt: "2024-01-01",
        createdById: "5", // ctv002
    },
    {
        clientId: "ANL_009",
        clientName: "HTX Trồng trọt Sạch Đồng Xanh",
        legalId: "7890123456",
        clientAddress: "Ấp 3, Xã Phước Hiệp, Huyện Củ Chi, TP. HCM",
        invoiceInfo: "HTX Trồng trọt Sạch Đồng Xanh - MST: 7890123456",
        clientSaleScope: "private",
        availableByIds: ["5"], // Chỉ ctv002 được xem
        totalOrderAmount: 2900000,
        lastOrder: "2024-11-28",
        contacts: [{ name: "Huỳnh Văn Xanh", email: "xanh.hv@dongxanh.vn" }],
        invoiceEmail: "dongxanh.coop@gmail.com",
        createdAt: "2024-01-01",
        createdById: "5", // ctv002
    },
    {
        clientId: "ANL_010",
        clientName: "Cơ sở Chế biến Thủy sản Hải Phong",
        legalId: "6549873210",
        clientAddress: "12 Đường Bờ Kè, Phường 5, Quận 4, TP. HCM",
        invoiceInfo: "Cơ sở Chế biến Thủy sản Hải Phong - MST: 6549873210",
        clientSaleScope: "private",
        availableByIds: ["1", "2"], // ctv001 và kd001 được xem
        totalOrderAmount: 6700000,
        lastOrder: "2024-12-22",
        contacts: [{ name: "Lê Hải Phong", email: "phong.lh@haiphong.com" }],
        invoiceEmail: "haiphong.seafood@outlook.com",
        createdAt: "2024-01-01",
        createdById: "1", // ctv001
    },
    {
        clientId: "ANL_011",
        clientName: "Xí nghiệp May Việt Tiến",
        legalId: "4567890123",
        clientAddress: "199 Lũy Bán Bích, Phường Tân Thành, Quận Tân Phú, TP. HCM",
        invoiceInfo: "Xí nghiệp May Việt Tiến - MST: 4567890123",
        clientSaleScope: "private",
        availableByIds: ["5", "6"], // ctv002 và kd002 được xem
        totalOrderAmount: 4100000,
        lastOrder: "2024-12-03",
        contacts: [{ name: "Phan Văn Tiến", email: "tien.pv@viettien.vn" }],
        invoiceEmail: "viettien.garment@gmail.com",
        createdAt: "2024-01-01",
        createdById: "5", // ctv002
    },
    {
        clientId: "ANL_012",
        clientName: "Công ty TNHH Sản xuất Nhựa Phú Thịnh",
        legalId: "2109876543",
        clientAddress: "345 Lê Văn Quới, Phường Bình Trị Đông A, Quận Bình Tân, TP. HCM",
        invoiceInfo: "Công ty TNHH Sản xuất Nhựa Phú Thịnh - MST: 2109876543",
        clientSaleScope: "private",
        availableByIds: ["1"], // Chỉ ctv001 được xem
        totalOrderAmount: 7800000,
        lastOrder: "2024-12-16",
        contacts: [
            { name: "Đỗ Thị Thịnh", email: "thinh.dt@phuthinh.com" },
            { name: "Trương Văn Phú", email: "phu.tv@phuthinh.com" },
        ],
        invoiceEmail: "phuthinh.plastic@yahoo.com",
        createdAt: "2024-01-01",
        createdById: "1", // ctv001
    },

    // MIX - Thêm các clients đa dạng hơn
    {
        clientId: "ANL_013",
        clientName: "Khách sạn & Spa Thiên Đường Xanh",
        legalId: "9876543210",
        clientAddress: "1 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM",
        invoiceInfo: "Khách sạn & Spa Thiên Đường Xanh - MST: 9876543210",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 12500000,
        lastOrder: "2024-12-27",
        contacts: [{ name: "Mai Thanh Thúy", email: "thuy.mt@greenparadise.vn" }],
        invoiceEmail: "reservation@greenparadise.vn",
        createdAt: "2024-01-01",
        createdById: "6", // kd002
    },
    {
        clientId: "ANL_014",
        clientName: "Bệnh viện Đa khoa Quốc tế Phương Đông",
        legalId: "0156789012",
        clientAddress: "268 Tô Hiến Thành, Phường 15, Quận 10, TP. HCM",
        invoiceInfo: "Bệnh viện Đa khoa Quốc tế Phương Đông - MST: 0156789012",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 38600000,
        lastOrder: "2024-12-24",
        contacts: [
            { name: "BS. Nguyễn Thanh Bình", email: "binh.nt@phuongdong-hospital.vn" },
            { name: "Dược sĩ Lê Minh Tâm", email: "tam.lm@phuongdong-hospital.vn" },
        ],
        invoiceEmail: "procurement@phuongdong-hospital.vn",
        createdAt: "2024-01-01",
        createdById: "2", // kd001
    },
    {
        clientId: "ANL_015",
        clientName: "Trung tâm Nghiên cứu Nông nghiệp Công nghệ cao",
        legalId: "0178901234",
        clientAddress: "Khu Nông nghiệp Công nghệ cao, Phường Hiệp Phú, TP. Thủ Đức, TP. HCM",
        invoiceInfo: "Trung tâm Nghiên cứu Nông nghiệp Công nghệ cao - MST: 0178901234",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 24700000,
        lastOrder: "2024-12-19",
        contacts: [
            { name: "TS. Phạm Văn Học", email: "hoc.pv@hitech-agri.vn" },
            { name: "ThS. Trần Thị Ngân", email: "ngan.tt@hitech-agri.vn" },
        ],
        invoiceEmail: "research@hitech-agri.vn",
        createdAt: "2024-01-01",
        createdById: "6", // kd002
    },
    {
        clientId: "ANL_016",
        clientName: "Cơ sở Giặt ủi Công nghiệp Kim Ngân",
        legalId: "1234509876",
        clientAddress: "456 Lương Định Của, Phường An Khánh, Quận 2 (nay là TP. Thủ Đức), TP. HCM",
        invoiceInfo: "Cơ sở Giặt ủi Công nghiệp Kim Ngân - MST: 1234509876",
        clientSaleScope: "private",
        availableByIds: ["5"], // Chỉ ctv002 được xem
        totalOrderAmount: 3800000,
        lastOrder: "2024-12-14",
        contacts: [{ name: "Nguyễn Kim Ngân", email: "ngan.nk@kimngan.com" }],
        invoiceEmail: "kimngan.laundry@gmail.com",
        createdAt: "2024-01-01",
        createdById: "5", // ctv002
    },
    {
        clientId: "ANL_017",
        clientName: "Công ty CP Sản xuất Đồ uống Vị Việt",
        legalId: "0134567890",
        clientAddress: "123 Phan Anh, Phường Bình Trị Đông, Quận Bình Tân, TP. HCM",
        invoiceInfo: "Công ty CP Sản xuất Đồ uống Vị Việt - MST: 0134567890",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 31200000,
        lastOrder: "2024-12-28",
        contacts: [
            { name: "Lương Văn Việt", email: "viet.lv@viviet.com.vn" },
            { name: "Cao Thị Thu", email: "thu.ct@viviet.com.vn" },
        ],
        invoiceEmail: "contact@viviet.com.vn",
        createdAt: "2024-01-01",
        createdById: "2", // kd001
    },
    {
        clientId: "ANL_018",
        clientName: "Trại chăn nuôi Heo sạch Đồng Tháp",
        legalId: "5678901234",
        clientAddress: "Ấp Mỹ Hòa, Xã Mỹ An, Huyện Tháp Mười, Tỉnh Đồng Tháp",
        invoiceInfo: "Trại chăn nuôi Heo sạch Đồng Tháp - CMND: 123456789",
        clientSaleScope: "private",
        availableByIds: ["5", "2"], // ctv002 và kd001 được xem
        totalOrderAmount: 2200000,
        lastOrder: "2024-11-30",
        contacts: [{ name: "Trần Văn Lợi", email: "loi.tv@dongthappig.vn" }],
        invoiceEmail: "dongthap.pig@gmail.com",
        createdAt: "2024-01-01",
        createdById: "5", // ctv002
    },
    {
        clientId: "ANL_019",
        clientName: "Xưởng Sản xuất Giày dép Xuất khẩu Hùng Vương",
        legalId: "8901234567",
        clientAddress: "789 Tỉnh lộ 10, Phường Tân Tạo, Quận Bình Tân, TP. HCM",
        invoiceInfo: "Xưởng Sản xuất Giày dép Xuất khẩu Hùng Vương - MST: 8901234567",
        clientSaleScope: "private",
        availableByIds: ["1", "6"], // ctv001 và kd002 được xem
        totalOrderAmount: 5900000,
        lastOrder: "2024-12-11",
        contacts: [{ name: "Lê Hùng Vương", email: "vuong.lh@hungvuongshoes.com" }],
        invoiceEmail: "export@hungvuongshoes.com",
        createdAt: "2024-01-01",
        createdById: "1", // ctv001
    },
    {
        clientId: "ANL_020",
        clientName: "Công ty TNHH Mỹ phẩm Thiên Nhiên Việt",
        legalId: "0123498765",
        clientAddress: "55 Cao Thắng, Phường 3, Quận 3, TP. HCM",
        invoiceInfo: "Công ty TNHH Mỹ phẩm Thiên Nhiên Việt - MST: 0123498765",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 16800000,
        lastOrder: "2024-12-26",
        contacts: [
            { name: "Nguyễn Thị Hồng Nhung", email: "nhung.nth@vietnaturalcosmetics.vn" },
            { name: "Đặng Minh Quân", email: "quan.dm@vietnaturalcosmetics.vn" },
        ],
        invoiceEmail: "sales@vietnaturalcosmetics.vn",
        createdAt: "2024-01-01",
        createdById: "6", // kd002
    },

    // CLIENTS FOR CLIENT LOGIN USERS
    {
        clientId: "1001",
        clientName: "Công ty TNHH Sản xuất Giấy Phương Nam",
        legalId: "0145678923",
        clientAddress: "88 Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP. HCM",
        invoiceInfo: "Công ty TNHH Sản xuất Giấy Phương Nam - MST: 0145678923",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 18500000,
        lastOrder: "2024-12-29",
        contacts: [{ name: "Phạm Thị D", email: "client001@example.com" }],
        invoiceEmail: "invoice@phuongnam-paper.vn",
        createdAt: "2024-01-01",
        createdById: "2", // kd001
    },
    {
        clientId: "1002",
        clientName: "Xưởng In Ấn & Bao Bì Đại Việt",
        legalId: "0167894521",
        clientAddress: "456 Lê Văn Việt, Phường Hiệp Phú, TP. Thủ Đức, TP. HCM",
        invoiceInfo: "Xưởng In Ấn & Bao Bì Đại Việt - MST: 0167894521",
        clientSaleScope: "public",
        availableByIds: [],
        totalOrderAmount: 9200000,
        lastOrder: "2024-12-23",
        contacts: [{ name: "Đặng Văn G", email: "client002@example.com" }],
        invoiceEmail: "daiviet.printing@gmail.com",
        createdAt: "2024-01-01",
        createdById: "6", // kd002
    },
];

export const mockSampleTypes: SampleType[] = [
    { sampleTypeId: "ST001", sampleTypeName: "Nước sạch", createdById: "system" },
    { sampleTypeId: "ST002", sampleTypeName: "Nước thải", createdById: "system" },
    { sampleTypeId: "ST003", sampleTypeName: "Thực phẩm", createdById: "system" },
];

export const mockProtocols: Protocol[] = [
    { protocolId: "PRO001", protocolCode: "TCVN 6492:2011", protocolAccreditation: { VILAS: true, TDC: false } },
    { protocolId: "PRO002", protocolCode: "SMEWW 5220C:2012", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO003", protocolCode: "SMEWW 5210B:2012", protocolAccreditation: { VILAS: true, TDC: false } },
    { protocolId: "PRO004", protocolCode: "SMEWW 2540D:2012", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO005", protocolCode: "TCVN 6179-1:1996", protocolAccreditation: { VILAS: false, TDC: false } },
    { protocolId: "PRO006", protocolCode: "TCVN 6180:1996", protocolAccreditation: { VILAS: true, TDC: false } },
    { protocolId: "PRO007", protocolCode: "SMEWW 4500-P:2012", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO008", protocolCode: "TCVN 6187-1:1996", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO009", protocolCode: "TCVN 6187-2:1996", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO010", protocolCode: "TCVN 6193:1996", protocolAccreditation: { VILAS: true, TDC: false } },
    { protocolId: "PRO011", protocolCode: "SMEWW 2550:2012", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO012", protocolCode: "SMEWW 2120C:2012", protocolAccreditation: { VILAS: true, TDC: false } },
    { protocolId: "PRO013", protocolCode: "TCVN 5070:1995", protocolAccreditation: { VILAS: false, TDC: false } },
    { protocolId: "PRO014", protocolCode: "SMEWW 4500-Cl:2012", protocolAccreditation: { VILAS: true, TDC: true } },
    { protocolId: "PRO015", protocolCode: "SMEWW 4500-SO4:2012", protocolAccreditation: { VILAS: true, TDC: false } },
];

export const mockParameters: Parameter[] = [
    { parameterId: "P001", parameterName: "pH", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P002", parameterName: "COD (Chemical Oxygen Demand)", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P003", parameterName: "BOD5 (Biological Oxygen Demand)", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P004", parameterName: "TSS (Total Suspended Solids)", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P005", parameterName: "Ammonium (NH4+)", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P006", parameterName: "Nitrate (NO3-)", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P007", parameterName: "Total Phosphorus", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P008", parameterName: "Coliform", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P009", parameterName: "E. coli", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P010", parameterName: "Tổng kim loại nặng", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P011", parameterName: "Nhiệt độ", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P012", parameterName: "Độ màu", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P013", parameterName: "Dầu mỡ", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P014", parameterName: "Clo dư", createdAt: "2024-01-01", createdById: "system" },
    { parameterId: "P015", parameterName: "Sulfate (SO4 2-)", createdAt: "2024-01-01", createdById: "system" },
];

// Helper to create matrix items
const createMatrix = (id: string, paramId: string, protoId: string, sampleTypeId: string, field: "chemistry" | "physics" | "microbiology", price: number): Matrix => {
    const param = mockParameters.find((p) => p.parameterId === paramId)!;
    const proto = mockProtocols.find((p) => p.protocolId === protoId)!;
    const st = mockSampleTypes.find((s) => s.sampleTypeId === sampleTypeId)!;

    return {
        matrixId: id,
        parameterId: paramId,
        protocolId: protoId,
        sampleTypeId: sampleTypeId,
        parameterName: param.parameterName,
        protocolCode: proto.protocolCode,
        protocolSource: proto.protocolSource,
        protocolAccreditation: proto.protocolAccreditation,
        sampleTypeName: st.sampleTypeName,
        scientificField: field,
        feeBeforeTax: price,
        taxRate: 8,
    };
};

export const mockMatrix: Matrix[] = [
    createMatrix("MAT001", "P001", "PRO001", "ST001", "chemistry", 50000),
    createMatrix("MAT002", "P002", "PRO002", "ST002", "chemistry", 120000),
    createMatrix("MAT003", "P003", "PRO003", "ST002", "chemistry", 150000),
    createMatrix("MAT004", "P004", "PRO004", "ST002", "physics", 80000),
    createMatrix("MAT005", "P005", "PRO005", "ST001", "chemistry", 90000),
    createMatrix("MAT006", "P006", "PRO006", "ST001", "chemistry", 85000),
    createMatrix("MAT007", "P007", "PRO007", "ST002", "chemistry", 95000),
    createMatrix("MAT008", "P008", "PRO008", "ST001", "microbiology", 110000),
    createMatrix("MAT009", "P009", "PRO009", "ST001", "microbiology", 130000),
    createMatrix("MAT010", "P010", "PRO010", "ST002", "chemistry", 200000),
    createMatrix("MAT011", "P011", "PRO011", "ST001", "physics", 30000),
    createMatrix("MAT012", "P012", "PRO012", "ST001", "physics", 60000),
    createMatrix("MAT013", "P013", "PRO013", "ST002", "chemistry", 140000),
    createMatrix("MAT014", "P014", "PRO014", "ST001", "chemistry", 70000),
    createMatrix("MAT015", "P015", "PRO015", "ST001", "chemistry", 75000),
];

export const scientificFields = [
    { value: "chemistry", label: "Hóa học" },
    { value: "physics", label: "Lý học" },
    { value: "microbiology", label: "Vi sinh" },
];

export const mockQuotes: Quote[] = [
    {
        quoteId: "BG001",
        quoteCode: "BG-2024-001",
        clientId: "ANL_001",
        client: mockClients[0],
        salePerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        samples: [],
        totalFeeBeforeTax: 1000000,
        taxRate: 8,
        discount: 0,
        totalAmount: 1080000,
        quoteStatus: "Draft",
        contactPerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        createdAt: "2024-01-01",
        createdById: "U001",
        modifiedAt: "2024-01-02",
        modifiedById: "U001",
    },
    {
        quoteId: "BG002",
        quoteCode: "BG-2024-002",
        clientId: "ANL_002",
        client: mockClients[1],
        salePerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        samples: [],
        totalFeeBeforeTax: 2000000,
        taxRate: 8,
        discount: 100000,
        totalAmount: 2052000,
        quoteStatus: "Sent",
        contactPerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        createdAt: "2024-01-02",
        createdById: "U001",
    },
];

export const mockOrders: Order[] = [
    {
        orderId: "DH001",
        quoteId: "BG002",
        clientId: "ANL_002",
        client: mockClients[1],
        salePerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        samples: [],
        totalAmount: 2052000,
        orderStatus: "Pending",
        paymentStatus: "Unpaid",
        contactPerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        createdAt: "2024-01-03",
        createdById: "U001",
    },
    {
        orderId: "DH002",
        quoteId: undefined,
        clientId: "ANL_001",
        client: mockClients[0],
        salePerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        samples: [],
        totalAmount: 1080000,
        orderStatus: "Processing",
        paymentStatus: "Paid",
        contactPerson: { identityId: "U001", identityName: "Nguyễn Văn A" },
        createdAt: "2024-01-04",
        createdById: "U001",
    },
];
