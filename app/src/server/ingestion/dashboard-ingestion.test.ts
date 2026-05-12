import { beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { getDashboardData } from "@/server/analytics/dashboard-data";
import { resetDashboardData, processDashboardFiles, type DashboardFileInput, type SourceHint } from "@/server/ingestion/dashboard-ingestion";

function csvValue(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvBuffer(rows: Array<Record<string, string | number | null | undefined>>) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");

  return Buffer.from(csv, "utf8");
}

function fileInput(sourceHint: SourceHint, rows: Array<Record<string, string | number | null | undefined>>): DashboardFileInput {
  return {
    fileName: `${sourceHint}.csv`,
    sourceHint,
    buffer: csvBuffer(rows),
  };
}

function tiktokIncomeInput(sourceHint: "tiktok1_income" | "tiktok2_income", totalSettlementAmount = 75_189_905): DashboardFileInput {
  const workbook = XLSX.utils.book_new();
  const reportsSheet = XLSX.utils.aoa_to_sheet([
    ["Time period:", "", "", "", "2026/04/01-2026/04/30"],
    [],
    [],
    [],
    ["Total settlement amount", "", "", "", totalSettlementAmount],
    ["", "Total Revenue", "", "", 88_640_462],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    ["", "Total Fees", "", "", -13_450_557],
  ]);
  XLSX.utils.book_append_sheet(workbook, reportsSheet, "Reports");

  return {
    fileName: `${sourceHint}.xlsx`,
    sourceHint,
    buffer: Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })),
  };
}

function shopeeIncomeInput(totalReleasedAmount = 134_715_337): DashboardFileInput {
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Income Report", "", "", ""],
    ["Report Details", "", "", ""],
    ["Username (Seller)", "kayou_id", "", ""],
    ["From", "2026-04-01", "", ""],
    ["to", "2026-04-30", "", ""],
    ["Income Summary", "", "", "Rp"],
    ["1. Total Revenue", "", "", 173_006_988],
    ["2. Total Expenses", "", "", -38_291_651],
    ["3. Total Released Amount", "", "", totalReleasedAmount],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  return {
    fileName: "shopee_income.xlsx",
    sourceHint: "shopee_income",
    buffer: Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })),
  };
}

function tiktokRow(overrides: Record<string, string | number | null | undefined>) {
  return {
    "Order ID": "TT-1",
    "Order Status": "Completed",
    "Order Amount": 0,
    "Order Refund Amount": 0,
    "SKU Subtotal After Discount": 0,
    "Seller SKU": "SKU-TT-1",
    "SKU ID": "SKU-TT-1",
    "Created Time": "20260401 10:00:00",
    "Product Name": "Kayou Paid Product",
    Variation: "Default",
    Quantity: 1,
    Province: "DKI Jakarta",
    "Regency and City": "Jakarta Timur",
    Districts: "Cakung",
    Villages: "Pulogebang",
    "Buyer Username": "buyer-a",
    Recipient: "Customer A",
    "Phone #": "0812",
    "SKU Subtotal Before Discount": 0,
    "SKU Platform Discount": 0,
    "SKU Seller Discount": 0,
    "Payment platform discount": 0,
    "Sku Quantity of return": 0,
    ...overrides,
  };
}

function shopeeRow(overrides: Record<string, string | number | null | undefined>) {
  return {
    "No. Pesanan": "SP-1",
    "Status Pesanan": "Selesai",
    "Total Pembayaran": 0,
    "Harga Setelah Diskon": 0,
    Jumlah: 1,
    "Nomor Referensi SKU": "SKU-SP-1",
    "SKU Induk": "SKU-SP-1",
    "Nama Produk": "Kayou Shopee Product",
    "Nama Variasi": "Default",
    "Waktu Pesanan Dibuat": "01/04/2026 10:00",
    "Waktu Pesanan Selesai": "04/04/2026 10:00",
    Provinsi: "DKI Jakarta",
    "Kota/Kabupaten": "Kota Jakarta Timur",
    "Username (Pembeli)": "shopee-buyer",
    "Nama Penerima": "Shopee Customer",
    "Harga Awal": 0,
    "Total Diskon": 0,
    "Diskon Dari Penjual": 0,
    "Diskon Dari Shopee": 0,
    "Voucher Ditanggung Penjual": 0,
    "Voucher Ditanggung Shopee": 0,
    "Ongkos Kirim Dibayar oleh Pembeli": 0,
    "Status Pembatalan/ Pengembalian": "",
    ...overrides,
  };
}

describe("dashboard ingestion reporting rules", () => {
  beforeEach(async () => {
    await resetDashboardData();
  });

  it("calculates TikTok booked GMV from SKU Subtotal After Discount and active GMV after cancellation", async () => {
    await processDashboardFiles(
      [
        fileInput("tiktok1", [
          tiktokRow({
            "Order ID": "TT-100",
            "Order Amount": 99_999,
            "SKU Subtotal After Discount": 1_000,
            "Seller SKU": "SKU-A",
          }),
          tiktokRow({
            "Order ID": "TT-100",
            "Order Amount": 99_999,
            "SKU Subtotal After Discount": 2_500,
            "Seller SKU": "SKU-B",
          }),
          tiktokRow({
            "Order ID": "TT-200",
            "Order Status": "Cancelled",
            "Order Amount": 99_999,
            "Order Refund Amount": 750,
            "SKU Subtotal After Discount": 750,
            "Seller SKU": "SKU-C",
          }),
        ]),
      ],
      { replace: true },
    );

    const dashboard = await getDashboardData();
    const tiktok = dashboard.channels.find((channel) => channel.channelKey === "tiktok1");

    expect(tiktok).toMatchObject({
      orders: 2,
      activeOrders: 1,
      cancelledOrders: 1,
      bookedGMV: 4_250,
      activeGMV: 3_500,
      refundAmount: 750,
    });
  });

  it("deduplicates multi-line marketplace orders while keeping line-item GMV", async () => {
    await processDashboardFiles(
      [
        fileInput("tiktok1", [
          tiktokRow({ "Order ID": "TT-MULTI", "SKU Subtotal After Discount": 1_200, "Seller SKU": "SKU-1" }),
          tiktokRow({ "Order ID": "TT-MULTI", "SKU Subtotal After Discount": 1_300, "Seller SKU": "SKU-2" }),
        ]),
      ],
      { replace: true },
    );

    const dashboard = await getDashboardData();
    const tiktok = dashboard.channels.find((channel) => channel.channelKey === "tiktok1");

    expect(tiktok?.orders).toBe(1);
    expect(tiktok?.lineItems).toBe(2);
    expect(tiktok?.bookedGMV).toBe(2_500);
    expect(tiktok?.activeGMV).toBe(2_500);
  });

  it("replaces only the uploaded channel and preserves other channel data", async () => {
    await processDashboardFiles(
      [
        fileInput("shopee", [
          shopeeRow({
            "No. Pesanan": "SP-KEEP",
            "Total Pembayaran": 10_000,
            "Harga Setelah Diskon": 5_000,
            Jumlah: 2,
          }),
        ]),
        fileInput("tiktok1", [
          tiktokRow({ "Order ID": "TT-OLD", "SKU Subtotal After Discount": 3_000 }),
        ]),
      ],
      { replace: true },
    );

    await processDashboardFiles(
      [
        fileInput("tiktok1", [
          tiktokRow({ "Order ID": "TT-NEW", "SKU Subtotal After Discount": 700 }),
        ]),
      ],
      { replace: true },
    );

    const dashboard = await getDashboardData();
    const shopee = dashboard.channels.find((channel) => channel.channelKey === "shopee");
    const tiktok = dashboard.channels.find((channel) => channel.channelKey === "tiktok1");

    expect(shopee?.bookedGMV).toBe(10_000);
    expect(shopee?.orders).toBe(1);
    expect(tiktok?.bookedGMV).toBe(700);
    expect(tiktok?.orders).toBe(1);
    expect(dashboard.orders.some((order) => order.sourceOrderId === "TT-OLD")).toBe(false);
  });

  it("calculates Shopee released amount from completed delivered orders with order-level dedupe", async () => {
    await processDashboardFiles(
      [
        fileInput("shopee", [
          shopeeRow({
            "No. Pesanan": "SP-PAY-1",
            "Total Pembayaran": "100.000",
            "Harga Setelah Diskon": "50.000",
            Jumlah: 1,
            "Voucher Ditanggung Shopee": "10.000",
            "Ongkos Kirim Dibayar oleh Pembeli": "5.000",
            "Waktu Pesanan Dibuat": "01/04/2026 10:00",
            "Waktu Pesanan Selesai": "04/04/2026 10:00",
            "Nomor Referensi SKU": "SKU-SP-PAY-1",
          }),
          shopeeRow({
            "No. Pesanan": "SP-PAY-1",
            "Total Pembayaran": "100.000",
            "Harga Setelah Diskon": "25.000",
            Jumlah: 2,
            "Voucher Ditanggung Shopee": "20.000",
            "Ongkos Kirim Dibayar oleh Pembeli": "5.000",
            "Waktu Pesanan Dibuat": "01/04/2026 10:00",
            "Waktu Pesanan Selesai": "04/04/2026 10:00",
            "Nomor Referensi SKU": "SKU-SP-PAY-2",
          }),
          shopeeRow({
            "No. Pesanan": "SP-PAY-MAY",
            "Total Pembayaran": "70.000",
            "Harga Setelah Diskon": "70.000",
            Jumlah: 1,
            "Voucher Ditanggung Shopee": "7.000",
            "Ongkos Kirim Dibayar oleh Pembeli": "3.000",
            "Waktu Pesanan Dibuat": "30/04/2026 10:00",
            "Waktu Pesanan Selesai": "02/05/2026 10:00",
            "Nomor Referensi SKU": "SKU-SP-PAY-MAY",
          }),
        ]),
      ],
      { replace: true },
    );

    const dashboard = await getDashboardData(new URLSearchParams("start=2026-04-01&end=2026-04-30"));
    const shopee = dashboard.channels.find((channel) => channel.channelKey === "shopee");

    expect(shopee?.orders).toBe(2);
    expect(shopee?.bookedGMV).toBe(170_000);
    expect(shopee?.gmvPayment).toBe(135_000);
  });

  it("stores TikTok income released amount without replacing all-order transactions", async () => {
    await processDashboardFiles(
      [
        fileInput("tiktok1", [
          tiktokRow({ "Order ID": "TT-OLD", "SKU Subtotal After Discount": 3_000 }),
        ]),
      ],
      { replace: true },
    );

    await processDashboardFiles([tiktokIncomeInput("tiktok1_income")], { replace: true });

    let dashboard = await getDashboardData(new URLSearchParams("start=2026-04-01&end=2026-04-30"));
    let tiktok = dashboard.channels.find((channel) => channel.channelKey === "tiktok1");

    expect(tiktok?.orders).toBe(1);
    expect(tiktok?.bookedGMV).toBe(3_000);
    expect(tiktok?.gmvPayment).toBe(75_189_905);

    await processDashboardFiles(
      [
        fileInput("tiktok1", [
          tiktokRow({ "Order ID": "TT-NEW", "SKU Subtotal After Discount": 9_000 }),
        ]),
      ],
      { replace: true },
    );

    dashboard = await getDashboardData(new URLSearchParams("start=2026-04-01&end=2026-04-30"));
    tiktok = dashboard.channels.find((channel) => channel.channelKey === "tiktok1");

    expect(tiktok?.orders).toBe(1);
    expect(tiktok?.bookedGMV).toBe(9_000);
    expect(tiktok?.gmvPayment).toBe(75_189_905);
    expect(dashboard.orders.some((order) => order.sourceOrderId === "TT-OLD")).toBe(false);
  });

  it("stores Shopee income released amount and falls back to order reconstruction only when income is absent", async () => {
    await processDashboardFiles(
      [
        fileInput("shopee", [
          shopeeRow({
            "No. Pesanan": "SP-PAY-1",
            "Total Pembayaran": "100.000",
            "Harga Setelah Diskon": "100.000",
            Jumlah: 1,
            "Voucher Ditanggung Shopee": "10.000",
            "Ongkos Kirim Dibayar oleh Pembeli": "5.000",
            "Waktu Pesanan Dibuat": "01/04/2026 10:00",
            "Waktu Pesanan Selesai": "04/04/2026 10:00",
          }),
        ]),
      ],
      { replace: true },
    );

    let dashboard = await getDashboardData(new URLSearchParams("start=2026-04-01&end=2026-04-30"));
    let shopee = dashboard.channels.find((channel) => channel.channelKey === "shopee");
    expect(shopee?.gmvPayment).toBe(115_000);

    await processDashboardFiles([shopeeIncomeInput()], { replace: true });

    dashboard = await getDashboardData(new URLSearchParams("start=2026-04-01&end=2026-04-30"));
    shopee = dashboard.channels.find((channel) => channel.channelKey === "shopee");
    expect(shopee?.orders).toBe(1);
    expect(shopee?.gmvPayment).toBe(134_715_337);

    await processDashboardFiles(
      [
        fileInput("shopee", [
          shopeeRow({
            "No. Pesanan": "SP-PAY-2",
            "Total Pembayaran": "50.000",
            "Harga Setelah Diskon": "50.000",
            Jumlah: 1,
            "Waktu Pesanan Dibuat": "01/04/2026 10:00",
            "Waktu Pesanan Selesai": "04/04/2026 10:00",
          }),
        ]),
      ],
      { replace: true },
    );

    dashboard = await getDashboardData(new URLSearchParams("start=2026-04-01&end=2026-04-30"));
    shopee = dashboard.channels.find((channel) => channel.channelKey === "shopee");
    expect(shopee?.orders).toBe(1);
    expect(shopee?.bookedGMV).toBe(50_000);
    expect(shopee?.gmvPayment).toBe(134_715_337);
    expect(dashboard.orders.some((order) => order.sourceOrderId === "SP-PAY-1")).toBe(false);
  });

  it("wipes all dashboard data when reset is requested", async () => {
    await processDashboardFiles(
      [
        fileInput("tiktok1", [
          tiktokRow({ "Order ID": "TT-WIPE", "SKU Subtotal After Discount": 1_500 }),
        ]),
      ],
      { replace: true },
    );

    expect((await getDashboardData()).hasData).toBe(true);

    await resetDashboardData();

    const dashboard = await getDashboardData();
    expect(dashboard.hasData).toBe(false);
    expect(dashboard.summary.bookedGMV).toBe(0);
    expect(dashboard.channels).toHaveLength(0);
  });
});
