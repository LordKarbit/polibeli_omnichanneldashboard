# PRD WebApp Dashboard Omnichannel Sales — GT, MT, Shopee, TikTok Shop

**Version:** V2 — revised after replacing the original B2B file with `raw_dashboard.xlsx - export.csv`  
**Primary business rule update:** `MT / Modern Trade` is defined as rows where column CB / `Area Manager` = `Agency`; all other rows are `GT / General Trade`. For B2B GT/MT GMV, the source of truth is column AV / `SKUGMV sku gmv`.

---

## 1. Executive Summary dari Analisis File Upload

Dari file yang dianalisis, aplikasi harus memperlakukan data sebagai **line-item transaction data**, bukan order summary. Total order, total payment, shipping, refund, dan buyer/order metrics wajib dihitung dengan **deduplication di level order**, sedangkan GMV/SKU/quantity bisa dihitung di level item sesuai mapping masing-masing source.

| Metric | Value |
| --- | --- |
| Total booked GMV omnichannel | Rp 854.698.594 |
| Total active/non-cancelled GMV omnichannel | Rp 671.192.934 |
| B2B GT+MT booked GMV | Rp 521.021.300 |
| Marketplace booked GMV | Rp 333.677.294 |
| Total unique orders | 2.748 |
| Total raw line-items | 5.897 |
| Date range detected | 2026-04-01 sampai 2026-04-30 |

### 1.1 Channel Contribution

| Channel / Shop | Orders | Booked GMV | Active GMV | AOV Booked | % of Total Booked GMV |
| --- | --- | --- | --- | --- | --- |
| GT | 91 | Rp 107.203.300 | Rp 104.753.000 | Rp 1.178.058 | 12.5% |
| MT | 12 | Rp 413.818.000 | Rp 363.898.000 | Rp 34.484.833 | 48.4% |
| TikTok Shop 1 | 1.512 | Rp 196.755.985 | Rp 89.726.902 | Rp 130.130 | 23.0% |
| TikTok Shop 2 | 121 | Rp 33.867.856 | Rp 9.761.579 | Rp 279.900 | 4.0% |
| Shopee | 1.012 | Rp 103.053.453 | Rp 103.053.453 | Rp 101.831 | 12.1% |

**Key insight:** MT memiliki order paling kecil secara volume, tetapi kontribusi GMV terbesar karena transaksi bulk. GT memiliki order lebih banyak dari MT namun GMV lebih kecil, sehingga dashboard GT harus fokus pada eksekusi Regional Manager dan Area Manager. Marketplace memiliki order volume terbesar, tetapi perlu monitoring cancellation/refund terutama TikTok Shop 1 dan TikTok Shop 2.


### 1.2 Highlight GT: Regional Manager Performance

| Regional Manager | Orders | Active Orders | Booked GMV | Active GMV | Qty | Customers | % GT GMV |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nur Setyo Aji | 70 | 57 | Rp 70.721.700 | Rp 68.271.400 | 11.885 | 48 | 66.0% |
| Hakim Abdul Aziz | 21 | 16 | Rp 36.481.600 | Rp 36.481.600 | 7.117 | 12 | 34.0% |

### 1.3 Highlight GT: Area Manager Performance

| Area Manager | Regional Manager | Orders | Active Orders | Booked GMV | Active GMV | Qty | Customers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Riky Marojahan Hasibuan | Hakim Abdul Aziz | 14 | 12 | Rp 28.731.200 | Rp 28.731.200 | 5.347 | 8 |
| Wahyu Kusuma Nugroho | Nur Setyo Aji | 18 | 15 | Rp 19.468.900 | Rp 19.468.900 | 3.168 | 14 |
| Nur Setyo Aji | Nur Setyo Aji | 12 | 12 | Rp 15.102.200 | Rp 15.102.200 | 2.371 | 11 |
| Pungguh Ikhsan Priyombodo | Nur Setyo Aji | 16 | 10 | Rp 13.708.300 | Rp 11.258.000 | 2.618 | 8 |
| Lamsihar Sitorus | Nur Setyo Aji | 13 | 12 | Rp 12.667.700 | Rp 12.667.700 | 2.034 | 11 |
| Muliyawarman Muchtar | Nur Setyo Aji | 11 | 8 | Rp 9.774.600 | Rp 9.774.600 | 1.694 | 4 |
| Yoppi Dwi Ariesanto | Hakim Abdul Aziz | 7 | 4 | Rp 7.750.400 | Rp 7.750.400 | 1.770 | 4 |

**GT interpretation:** `Nur Setyo Aji` memegang kontribusi terbesar di level Regional Manager, sedangkan di level Area Manager kontribusi terbesar datang dari `Riky Marojahan Hasibuan`, diikuti `Wahyu Kusuma Nugroho`, `Nur Setyo Aji`, dan `Pungguh Ikhsan Priyombodo`. Dashboard GT harus menjadikan tabel/ranking ini sebagai visual utama, bukan hanya tambahan.


### 1.4 SKU Performance — B2B GT/MT

| SKU Code | SKU Name | Total GMV | GT GMV | MT GMV | Qty | Orders |
| --- | --- | --- | --- | --- | --- | --- |
| NR-KP-DZJ-001-SEA | Kayou - NARUTO-Smriti Collectible Cards-Earth Scroll-001-SEA-Series 1S | Rp 273.240.000 | Rp 1.080.000 | Rp 272.160.000 | 1.518 | 7 |
| KYID000001 | Kayou - Mobile Legends: Bang Bang-Collectible Cards-ORIGIN OF LEGEND-0 | Rp 89.807.000 | Rp 65.867.000 | Rp 23.940.000 | 554 | 82 |
| MLP-KP-YH-QY-002-SEA | Kayou - My Little Pony-Friendship Eternal Cards-Fun Moments Edition-SE | Rp 39.894.000 | Rp 27.654.000 | Rp 12.240.000 | 241 | 40 |
| KYID000004 | MLBB-HOD-1 packSet 1包 | Rp 38.400.000 | Rp 0 | Rp 38.400.000 | 1.920 | 2 |
| KYID000005 | Free Fire-Final Survivor Collectible Cards-Survival PackSet 1包 | Rp 38.400.000 | Rp 0 | Rp 38.400.000 | 1.920 | 2 |
| MLBB-KP-GXMY-001B-SEA | MLBB-OOL-1 packSet 1包 | Rp 23.040.000 | Rp 0 | Rp 23.040.000 | 2.880 | 2 |
| POSM-Kayou-MLBB-01 | Kayou - MLBB Display Rack | Rp 7.400.000 | Rp 7.000.000 | Rp 400.000 | 41 | 38 |
| kayou-card_album-MLBB | Kayou -  Card Album MLBBSpecification Specification | Rp 5.936.000 | Rp 1.848.000 | Rp 4.088.000 | 216 | 22 |
| KYWL680000020 | Kayou - Scratch Card | Rp 2.798.000 | Rp 1.649.000 | Rp 1.149.000 | 29.690 | 96 |
| MLBB-KP-GXMY-001A-SEA | Kayou - Mobile Legends: Bang Bang-Collectible Cards-Hand of Destiny-00 | Rp 2.100.000 | Rp 2.100.000 | Rp 0 | 7 | 2 |

#### Top GT SKU khusus General Trade

| SKU Code | SKU Name | GT GMV | GT Qty |
| --- | --- | --- | --- |
| KYID000001 | Kayou - Mobile Legends: Bang Bang-Collectible Cards-ORIGIN OF LEGEND-0 | Rp 65.867.000 | 421 |
| MLP-KP-YH-QY-002-SEA | Kayou - My Little Pony-Friendship Eternal Cards-Fun Moments Edition-SE | Rp 27.654.000 | 173 |
| POSM-Kayou-MLBB-01 | Kayou - MLBB Display Rack | Rp 7.000.000 | 39 |
| MLBB-KP-GXMY-001A-SEA | Kayou - Mobile Legends: Bang Bang-Collectible Cards-Hand of Destiny-00 | Rp 2.100.000 | 7 |
| kayou-card_album-MLBB | Kayou -  Card Album MLBBSpecification Specification | Rp 1.848.000 | 70 |
| KYWL680000020 | Kayou - Scratch Card | Rp 1.649.000 | 18.200 |
| NR-KP-DZJ-001-SEA | Kayou - NARUTO-Smriti Collectible Cards-Earth Scroll-001-SEA-Series 1S | Rp 1.080.000 | 6 |
| POSM-Kayou-Poster-2 | Kayou - Poster POSMSeries A4 | Rp 5.300 | 66 |

**SKU insight:** MT sangat terdorong oleh pembelian bulk Naruto dan beberapa packset besar. GT lebih terkonsentrasi pada MLBB, My Little Pony, POSM/display rack, album, dan scratch card. Aplikasi harus bisa memisahkan `paid SKU`, `POSM`, `free gift`, dan `scratch card/supporting material` agar analisis produk tidak bias.


### 1.5 Marketplace Performance

| Marketplace | Orders | Booked GMV | Active GMV | AOV | Refund Amount | SKU Gross Sales |
| --- | --- | --- | --- | --- | --- | --- |
| TikTok Shop 1 | 1.512 | Rp 196.755.985 | Rp 89.726.902 | Rp 130.130 | Rp 101.954.301 | Rp 188.638.470 |
| Shopee | 1.012 | Rp 103.053.453 | Rp 103.053.453 | Rp 101.831 | Rp 0 | Rp 140.982.686 |
| TikTok Shop 2 | 121 | Rp 33.867.856 | Rp 9.761.579 | Rp 279.900 | Rp 22.100.114 | Rp 30.211.433 |

### 1.6 Top Marketplace SKU

| Seller SKU | Product Name | SKU GMV | Qty | Orders | TikTok Shop 1 | TikTok Shop 2 | Shopee |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6937187412330*30 | 1 BOX 30 PACK KAYOU MOBILE LEGENDS Bang Bang ORIGIN OF LEGEND Seri 1 C | Rp 116.337.349 | 480 | 382 | Rp 59.768.349 | Rp 11.237.500 | Rp 45.331.500 |
| 6937187407275*30 | 1 BOX 30 PACK KAYOU MY LITTLE PONNY CR Friendship Eternity – Kartu Kol | Rp 90.158.470 | 495 | 461 | Rp 29.600.693 | Rp 6.918.877 | Rp 53.638.900 |
| 6937187409163*20 | 1 BOX 20 PACK KAYOU MOBILE LEGENDS Bang Bang Hand of Destiny UR Card – | Rp 52.380.012 | 180 | 168 | Rp 28.974.512 | Rp 4.727.500 | Rp 18.678.000 |
| 6937187407367*20 | 1 BOX 20 PACK KAYOU FREE FIRE Final Survivor – Kartu Koleksi Resmi GAM | Rp 36.198.289 | 120 | 114 | Rp 31.376.789 | Rp 2.689.500 | Rp 2.132.000 |
| 6937187407275*2 | 2 PACK KAYOU MY LITTLE PONNY CR Friendship Eternity – Kartu Koleksi Re | Rp 13.206.593 | 1.014 | 690 | Rp 6.746.173 | Rp 56.900 | Rp 6.403.520 |
| 6937187407275*10 | 【10 Paket】KAYOU My Little Pony Kartu CR Keabadian Persahabatan Paket M | Rp 10.700.364 | 200 | 185 | Rp 10.186.722 | Rp 513.642 | Rp 0 |
| 6937187412330*30+Album | [FREE ALBUM]1 BOX 30 PACK KAYOU MOBILE LEGENDS Bang Bang ORIGIN OF LEG | Rp 7.958.442 | 30 | 28 | Rp 2.574.942 | Rp 1.121.500 | Rp 4.262.000 |
| 6937187412330*2 | 2 PACK KAYOU MOBILE LEGENDS Bang Bang ORIGIN OF LEGEND Card Box – Offi | Rp 7.581.889 | 691 | 517 | Rp 3.805.508 | Rp 61.515 | Rp 3.714.866 |
| 6937187412330*10 | 【Eksklusif Penjualan】10 Packet KAYOU Mobile Legends: Bang Bang-ORIGIN  | Rp 4.771.600 | 74 | 72 | Rp 3.681.601 | Rp 1.089.999 | Rp 0 |
| 6937187409163*10 | 【10 Paket】KAYOU Mobile Legends: Bang Bang-Hand Of Destiny Tangan Nasib | Rp 4.559.601 | 35 | 31 | Rp 4.419.601 | Rp 140.000 | Rp 0 |
| 6937187406476*30 | 1 BOX 30 PACK KAYOU Naruto Shippuden Chapter of Earth SP Card – T2w8 K | Rp 3.810.000 | 22 | 15 | Rp 1.710.000 | Rp 0 | Rp 2.100.000 |
| 6937187412330 | 1 PACK KAYOU MOBILE LEGEND ORIGIN - HAND OF DESTINY - FREE FIRE – Kart | Rp 2.642.700 | 36 | 25 | Rp 734.000 | Rp 1.600.000 | Rp 308.700 |

**Marketplace insight:** terdapat 2.844 line-item bernilai 0 di marketplace, umumnya hadiah/free item/bundling. WebApp harus otomatis menandai `zero-value item` agar chart SKU revenue tidak bercampur dengan item hadiah.


### 1.7 Order Status / Cancellation Watch

| Source | Status | Orders | % within Source |
| --- | --- | --- | --- |
| B2B GT+MT | Received | 71 | 68.9% |
| B2B GT+MT | Cancelled | 19 | 18.4% |
| B2B GT+MT | Pending Receipt | 12 | 11.7% |
| B2B GT+MT | Pending Shipment | 1 | 1.0% |
| TikTok Shop 1 | Shipped | 584 | 38.6% |
| TikTok Shop 1 | Canceled | 470 | 31.1% |
| TikTok Shop 1 | Completed | 458 | 30.3% |
| TikTok Shop 2 | Canceled | 70 | 57.9% |
| TikTok Shop 2 | Completed | 33 | 27.3% |
| TikTok Shop 2 | Shipped | 18 | 14.9% |
| Shopee | Selesai | 852 | 84.2% |
| Shopee | Batal | 130 | 12.8% |
| Shopee | Sedang Dikirim | 19 | 1.9% |
| Shopee | Telah Dikirim | 11 | 1.1% |

**Risk insight:** TikTok Shop 2 memiliki cancellation rate order tertinggi pada sample ini. TikTok Shop 1 juga menunjukkan refund/cancel value yang besar. Dashboard harus memiliki Cancellation & Refund Control Page dengan drilldown sampai order, SKU, alasan cancel, dan waktu cancel.


### 1.8 Top Location by GMV

| Source | Province | City | Orders | GMV |
| --- | --- | --- | --- | --- |
| B2B MT | Agency | Agency | 10 | Rp 406.918.000 |
| B2B GT | Jawa Timur | Surabaya | 17 | Rp 19.468.900 |
| B2B GT | DKI Jakarta | Depok | 9 | Rp 19.427.800 |
| B2B GT | Jawa Barat | Bekasi | 12 | Rp 15.102.200 |
| B2B GT | Jawa Barat | Bandung | 13 | Rp 12.667.700 |
| B2B GT | Jawa Tengah | Yogyakarta | 15 | Rp 12.610.200 |
| B2B GT | Jawa Tengah | Semarang & Demak | 11 | Rp 9.774.600 |
| B2B MT | Other | Agency | 2 | Rp 6.900.000 |
| B2B GT | DKI Jakarta | Jakarta Timur | 1 | Rp 6.356.100 |
| Shopee | DKI JAKARTA | KOTA JAKARTA TIMUR | 53 | Rp 6.055.768 |
| TikTok Shop 1 | Bali | Kab. Klungkung | 5 | Rp 5.791.565 |
| Shopee | JAWA TIMUR | KOTA SURABAYA | 49 | Rp 5.582.392 |

---

## 2. Data Engineering Review

### 2.1 File yang Diproses

| Business Area | File | Detected Granularity | Important Rule |
| --- | --- | --- | --- |
| GT/MT B2B | raw_dashboard.xlsx - export.csv | 364 line-items / 103 unique orders | MT jika kolom CB / `Area Manager` = `Agency`; selain itu GT. GMV dari kolom AV `SKUGMV sku gmv`. |
| Shopee | Order.all.20260401_20260430.xlsx | 2,089 line-items / 1.012 unique orders | Order-level GMV dari `Total Pembayaran`, SKU-level dari `Harga Setelah Diskon × Jumlah`. |
| TikTok Shop 1 | All order-2026-05-04-14_03.csv | 3.180 line-items / 1.512 unique orders | Order-level GMV dari `Order Amount`, SKU-level dari `SKU Subtotal After Discount`. |
| TikTok Shop 2 | All order-2026-05-04-14_02.csv | 264 line-items / 121 unique orders | Order-level GMV dari `Order Amount`, SKU-level dari `SKU Subtotal After Discount`. |

### 2.2 Temuan Struktur Data

1. Semua source adalah **line-item export**. Satu order dapat muncul di beberapa baris karena memiliki banyak SKU, hadiah, voucher, POSM, atau bundling.

2. Field order-level seperti total pembayaran, refund, shipping fee, customer, status, dan alamat sering berulang di setiap line-item. Jika dijumlah langsung tanpa deduplication, nilai akan double-count.

3. File B2B memiliki field organisasi sales yang dapat dipakai untuk GT/MT: `Area Manager`, `Regional Manager`, `bdcity`, `bdprovince`. Untuk V2 ini, row dengan `Area Manager = Agency` adalah MT.

4. Kolom `customer name` muncul lebih dari sekali dalam file B2B. Pipeline harus rename duplicate columns, misalnya `customer_name_order` dan `customer_name_buyer_profile`.

5. Marketplace memiliki format status yang berbeda: Shopee memakai `Selesai`, `Batal`, `Sedang Dikirim`; TikTok memakai `Completed`, `Shipped`, `Canceled`. Perlu status normalization.

6. Marketplace SKU code tidak selalu sama dengan B2B SKU code. Contoh suffix `*30`, `*10`, `*2`, bundle `+Album`, atau gift SKU perlu masuk ke SKU normalization table.

7. Kolom GMV utama B2B harus terkunci ke `SKUGMV sku gmv` / kolom AV. Kolom lain seperti paid/payable/discount/refund tetap disimpan sebagai metric tambahan.


### 2.3 Deduplication Rules

```sql
-- Order key must be unique by source and shop/channel
order_key = source_system || '|' || shop_account || '|' || source_order_id;

-- B2B channel mapping
b2b_channel = CASE
  WHEN TRIM(area_manager) = 'Agency' THEN 'MT'
  ELSE 'GT'
END;

-- B2B line GMV source of truth
b2b_line_gmv = CAST(skugmv_sku_gmv AS NUMERIC);

-- Booked vs Active GMV
booked_gmv = SUM(line_gmv);
active_gmv = SUM(line_gmv) FILTER (WHERE normalized_order_status NOT IN ('cancelled', 'canceled', 'batal'));
```


### 2.4 Unified Source Mapping

| Unified Field | B2B GT/MT | Shopee | TikTok Shop |
| --- | --- | --- | --- |
| source_system | `b2b_raw_dashboard` | `shopee` | `tiktok_shop` |
| shop_account | `shop name` | `Shopee` | `TikTok Shop 1/2` from file name |
| channel_group | `GT`/`MT` by Area Manager rule | `Marketplace` | `Marketplace` |
| order_id | `sale order no` | `No. Pesanan` | `Order ID` |
| order_created_at | `order create time` | `Waktu Pesanan Dibuat` | `Created Time` |
| paid_at | `pay time` | `Waktu Pembayaran Dilakukan` | `Paid Time` |
| order_status_raw | `order status` | `Status Pesanan` | `Order Status` |
| line_sku_code | `SKU skucode` | `Nomor Referensi SKU` | `Seller SKU` |
| product_name | `spu name` / `SKU sku name` | `Nama Produk` | `Product Name` |
| quantity | `SKU sku quantity` | `Jumlah` | `Quantity` |
| line_gmv | `SKUGMV sku gmv` | `Harga Setelah Diskon × Jumlah` | `SKU Subtotal After Discount` |
| order_gmv | sum line GMV per order from AV | `Total Pembayaran` deduped | `Order Amount` deduped |
| discount | `IDR total discount amount` / SKU discounts | `Total Diskon`, seller/platform discounts | `SKU Seller Discount`, `SKU Platform Discount`, payment platform discount |
| refund | `IDR total refund amount` | status-based / return fields | `Order Refund Amount` |
| province/city | `bdprovince`, `bdcity`; fallback recipient fields | `Provinsi`, `Kota/Kabupaten` | `Province`, `Regency and City` |
| sales_org | `Regional Manager`, `Area Manager` | N/A | N/A |

---

## 3. Data Relationship & Business Logic

### 3.1 Keterkaitan Antar Data

- **Order relationship:** tidak ada order ID yang sama lintas channel; hubungan utama antar source adalah melalui waktu, SKU/product, lokasi, channel, dan customer/recipient identity.

- **SKU relationship:** B2B memakai `SKU skucode`, Shopee memakai `Nomor Referensi SKU`, TikTok memakai `Seller SKU`. Aplikasi perlu `dim_sku_alias` untuk menyatukan variasi kode seperti `6937187412330*30`, `6937187412330*10`, `6937187412330*2`, atau bundle `+Album`.

- **Customer relationship:** marketplace punya buyer username/recipient/phone/address; B2B punya customer name/buyer ID. Untuk privacy dan akurasi, sistem harus membuat `customer_identity_hash` dari kombinasi source + normalized buyer/recipient/phone bila tersedia.

- **Location relationship:** semua source punya province/city tetapi format berbeda. WebApp perlu standardisasi nama provinsi/kota agar filter dan peta tidak pecah.

- **Status relationship:** semua status raw harus dipetakan ke status standar: `created`, `paid`, `packed`, `shipped`, `delivered/received/completed`, `cancelled`, `returned/refunded`, `pending`.


### 3.2 Metric Definitions

| Metric | Definition | Default Dashboard Behavior |
| --- | --- | --- |
| Booked GMV | B2B: sum AV `SKUGMV sku gmv`; Marketplace: deduped order amount | Shown as headline GMV with toggle to include/exclude cancelled |
| Active GMV | Booked GMV excluding cancelled/batal/canceled order status | Default for operational sales performance |
| Order Count | Distinct `order_key` | Always deduped |
| Line Item Count | Count raw rows after ingestion | Used for data quality and SKU-level drilldown |
| AOV | Booked GMV / distinct orders | Shown by channel/shop/manager |
| Quantity Sold | Sum item quantity | Can include/exclude free gift/POSM/scratch card |
| Cancellation Rate | Cancelled orders / total orders | Shown by source, shop, SKU, province, day |
| Refund Amount | Refund value from source-specific fields | Shown separately from GMV |
| Discount Rate | Discount / gross value | Shown by SKU and channel where available |
| Freebie Ratio | Zero-value line-items / total marketplace line-items | Default flag for marketplace SKU analysis |

---

## 4. Proposed Database Architecture

### 4.1 Architecture Layers

1. **Raw Layer:** store uploaded files exactly as received, upload metadata, source file name, row number, raw JSON per row.

2. **Staging Layer:** parse numbers/dates, normalize column names, add source system, shop account, upload batch ID, row hash, and validation flags.

3. **Curated Layer:** create standard facts and dimensions for order, item, SKU, customer, location, channel, sales org, status, payment, fulfillment, refund.

4. **Analytics Mart:** pre-aggregated daily/channel/manager/SKU/customer tables for fast dashboard rendering and AI chatbot.

5. **Semantic Layer:** business metric dictionary, verified SQL templates, AI-safe query layer, and chart recommendation metadata.


### 4.2 Entity Relationship Overview

```text
raw_upload_batch 1──N raw_uploaded_file 1──N raw_order_line
                                      │
                                      ▼
stg_order_line ──N:1 dim_source_system
               ──N:1 dim_shop_account
               ──N:1 dim_channel
               ──N:1 dim_sku / dim_sku_alias
               ──N:1 dim_customer
               ──N:1 dim_location
               ──N:1 dim_sales_org
               ──N:1 dim_status

fact_order 1──N fact_order_item
           1──N fact_order_payment
           1──N fact_order_refund
           1──N fact_order_fulfillment_event

fact_order_item N──1 dim_sku
fact_order N──1 dim_customer
fact_order N──1 dim_location
fact_order N──1 dim_channel
fact_order N──1 dim_sales_org

analytics_daily_sales
analytics_manager_performance
analytics_sku_performance
analytics_marketplace_health
analytics_geo_sales
```


### 4.3 Core Tables

#### Upload & Raw Tables

```sql
CREATE TABLE raw_upload_batch (
  id UUID PRIMARY KEY,
  uploaded_by UUID,
  upload_context TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  processing_status TEXT,
  notes TEXT
);

CREATE TABLE raw_uploaded_file (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES raw_upload_batch(id),
  source_system TEXT NOT NULL,
  shop_account TEXT,
  original_file_name TEXT NOT NULL,
  file_type TEXT,
  file_hash TEXT UNIQUE,
  row_count INT,
  column_count INT,
  schema_detected JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE raw_order_line (
  id BIGSERIAL PRIMARY KEY,
  uploaded_file_id UUID REFERENCES raw_uploaded_file(id),
  row_number INT,
  raw_payload JSONB NOT NULL,
  row_hash TEXT,
  validation_status TEXT,
  validation_errors JSONB
);
```

#### Dimensions

```sql
CREATE TABLE dim_channel (
  id SERIAL PRIMARY KEY,
  channel_group TEXT NOT NULL,       -- GT, MT, Marketplace
  channel_name TEXT NOT NULL,        -- General Trade, Modern Trade, Shopee, TikTok Shop
  channel_type TEXT,                 -- offline, marketplace, agency
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE dim_sales_org (
  id BIGSERIAL PRIMARY KEY,
  regional_manager TEXT,
  area_manager TEXT,
  bd_name TEXT,
  bd_workcode TEXT,
  bd_city TEXT,
  bd_province TEXT,
  is_agency BOOLEAN DEFAULT false,
  UNIQUE (regional_manager, area_manager, bd_name, bd_city, bd_province)
);

CREATE TABLE dim_sku (
  id BIGSERIAL PRIMARY KEY,
  canonical_sku_code TEXT,
  barcode TEXT,
  brand_name TEXT,
  product_name TEXT,
  sku_name TEXT,
  category_l1 TEXT,
  category_l2 TEXT,
  category_l3 TEXT,
  category_l4 TEXT,
  sku_type TEXT,                    -- paid_product, free_gift, posm, scratch_card, bundle
  pack_size INT,
  ip_name TEXT,                     -- MLBB, Naruto, My Little Pony, Free Fire, etc.
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE dim_sku_alias (
  id BIGSERIAL PRIMARY KEY,
  sku_id BIGINT REFERENCES dim_sku(id),
  source_system TEXT,
  source_sku_code TEXT,
  source_product_name TEXT,
  source_variation_name TEXT,
  alias_confidence NUMERIC(5,2),
  UNIQUE (source_system, source_sku_code, source_variation_name)
);

CREATE TABLE dim_customer (
  id BIGSERIAL PRIMARY KEY,
  customer_identity_hash TEXT UNIQUE,
  source_customer_id TEXT,
  customer_name TEXT,
  buyer_username TEXT,
  recipient_name TEXT,
  customer_type TEXT,               -- reseller, end_customer, agency, unknown
  primary_category TEXT
);

CREATE TABLE dim_location (
  id BIGSERIAL PRIMARY KEY,
  country TEXT DEFAULT 'Indonesia',
  province_raw TEXT,
  city_raw TEXT,
  district_raw TEXT,
  village_raw TEXT,
  province_standard TEXT,
  city_standard TEXT,
  latitude NUMERIC,
  longitude NUMERIC
);

CREATE TABLE dim_status (
  id BIGSERIAL PRIMARY KEY,
  source_system TEXT,
  raw_status TEXT,
  raw_substatus TEXT,
  normalized_status TEXT,           -- pending, paid, shipped, completed, cancelled, returned, refunded
  is_cancelled BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false
);
```

#### Facts

```sql
CREATE TABLE fact_order (
  id BIGSERIAL PRIMARY KEY,
  order_key TEXT UNIQUE NOT NULL,
  source_system TEXT NOT NULL,
  shop_account TEXT,
  source_order_id TEXT NOT NULL,
  channel_id INT REFERENCES dim_channel(id),
  customer_id BIGINT REFERENCES dim_customer(id),
  location_id BIGINT REFERENCES dim_location(id),
  sales_org_id BIGINT REFERENCES dim_sales_org(id),
  status_id BIGINT REFERENCES dim_status(id),
  order_created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  booked_order_gmv NUMERIC(18,2),
  active_order_gmv NUMERIC(18,2),
  order_paid_amount NUMERIC(18,2),
  order_payable_amount NUMERIC(18,2),
  order_discount_amount NUMERIC(18,2),
  order_refund_amount NUMERIC(18,2),
  shipping_fee_amount NUMERIC(18,2),
  payment_method TEXT,
  created_upload_batch_id UUID REFERENCES raw_upload_batch(id)
);

CREATE TABLE fact_order_item (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES fact_order(id),
  source_line_id BIGINT REFERENCES raw_order_line(id),
  sku_id BIGINT REFERENCES dim_sku(id),
  source_sku_code TEXT,
  quantity NUMERIC(18,2),
  returned_quantity NUMERIC(18,2),
  unit_original_price NUMERIC(18,2),
  unit_discounted_price NUMERIC(18,2),
  line_gross_amount NUMERIC(18,2),
  line_gmv NUMERIC(18,2),
  line_discount_amount NUMERIC(18,2),
  line_seller_discount_amount NUMERIC(18,2),
  line_platform_discount_amount NUMERIC(18,2),
  line_gross_profit_amount NUMERIC(18,2),
  is_free_item BOOLEAN DEFAULT false,
  is_bundle_component BOOLEAN DEFAULT false,
  is_posm BOOLEAN DEFAULT false
);

CREATE TABLE fact_order_refund (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES fact_order(id),
  refund_amount NUMERIC(18,2),
  refund_reason TEXT,
  refund_status TEXT,
  refund_created_at TIMESTAMPTZ
);

CREATE TABLE analytics_manager_performance_daily (
  sales_date DATE,
  channel_group TEXT,
  regional_manager TEXT,
  area_manager TEXT,
  booked_gmv NUMERIC(18,2),
  active_gmv NUMERIC(18,2),
  orders INT,
  active_orders INT,
  quantity NUMERIC(18,2),
  customers INT,
  cancellation_rate NUMERIC(8,4),
  PRIMARY KEY (sales_date, channel_group, regional_manager, area_manager)
);
```


---

## 5. Product Requirements

### 5.1 Product Vision

Membangun WebApp dashboard omnichannel yang memungkinkan user mengupload raw data GT/MT, Shopee, dan TikTok Shop, lalu sistem otomatis membersihkan data, menyatukan struktur, menghitung metric, menampilkan visualisasi interaktif profesional, menyediakan AI chatbot untuk tanya jawab data, dan memungkinkan semua hasil analisis di-download.


### 5.2 Target Users

- Management / Executive: melihat GMV, growth, channel contribution, risk, dan high-level decision.

- Head of Sales Operation: memonitor performa GT, MT, marketplace, manager, area, dan SKU.

- Regional Manager: melihat pencapaian sendiri, Area Manager, order, SKU, customer, dan wilayah.

- Area Manager: drilldown performa customer/reseller/SKU di area masing-masing.

- Marketplace Team: memonitor order, revenue, cancellation, refund, paid SKU, zero-value SKU, dan campaign bundle.

- Data/BI Admin: upload data, mapping schema, validasi, dan export hasil.


### 5.3 Core User Stories

1. Sebagai user, saya bisa upload file mentah GT/MT, Shopee, TikTok Shop 1, dan TikTok Shop 2 tanpa mengedit manual.

2. Sebagai user, saya ingin sistem otomatis mengenali source file, format kolom, tanggal, angka IDR, dan status order.

3. Sebagai Head of Sales, saya ingin GT dipisahkan dari MT dengan rule `Area Manager = Agency`, lalu GT menampilkan ranking Regional Manager dan Area Manager.

4. Sebagai user, saya ingin semua angka order-level tidak double-count walaupun satu order memiliki banyak line-item.

5. Sebagai management, saya ingin melihat booked GMV dan active GMV dengan filter include/exclude cancelled.

6. Sebagai BI user, saya ingin semua chart interaktif dengan filter, drilldown, tooltip, sort, search, dan download.

7. Sebagai user non-teknis, saya ingin bertanya ke AI chatbot seperti: “Area Manager mana yang paling tinggi GMV GT bulan April?” atau “SKU mana penyebab cancellation terbesar di TikTok Shop 2?”

8. Sebagai admin, saya ingin download hasil cleaned data, pivot summary, dan chart ke CSV/XLSX/PDF/PNG.


### 5.4 Functional Requirements

| Module | Requirement | Priority |
| --- | --- | --- |
| Upload Center | Multi-file upload untuk B2B GT/MT, Shopee, TikTok Shop 1, TikTok Shop 2; drag & drop; source selector; auto-detect schema. | P0 |
| Schema Detection | Mendeteksi kolom wajib, duplicate columns, date format, IDR numeric format, delimiter CSV, dan worksheet Excel. | P0 |
| Data Validation | Menampilkan data quality report: missing order ID, missing SKU, invalid GMV, duplicate order, cancelled GMV, zero-value item. | P0 |
| Channel Mapping | B2B: `Area Manager = Agency` menjadi MT; selain itu GT. Rule harus configurable di Settings. | P0 |
| GMV Engine | B2B GMV dari kolom AV; marketplace order GMV deduped; active GMV excludes cancelled. | P0 |
| SKU Normalization | Membuat mapping SKU alias antar B2B, Shopee, TikTok; tagging pack size, bundle, free gift, POSM, scratch card. | P0 |
| Dashboard | Executive, GT, MT, Marketplace, SKU, Geo, Operations, Customer, Data Quality pages. | P0 |
| Filters | Date range, source, channel, shop, Regional Manager, Area Manager, province, city, SKU, product, IP, status, payment method. | P0 |
| Drilldown | Klik chart → drilldown ke table order/SKU/customer; export subset data. | P0 |
| AI Chatbot | Natural language Q&A over uploaded data with metric dictionary and SQL generation guardrails. | P0 |
| Download Center | Download raw-cleaned data, dashboard data, chart image, Excel pivot, PDF executive report. | P0 |
| User Roles | Admin, Management, Sales Manager, Marketplace, Viewer with field-level permission. | P1 |
| Audit Trail | Record upload, mapping change, metric query, export, and AI query history. | P1 |

---

## 6. Dashboard & Visualization Requirements

### 6.1 Global UI/UX Principle

Tampilan harus **clean, premium, detail, dan professional BI-grade**: banyak insight tetapi tidak terasa penuh. Gunakan card KPI besar di atas, chart grid responsif, filter panel sticky, tooltip jelas, drilldown modal, dan downloadable table di setiap section.


### 6.2 Global Filters

- Date range, default current detected period.
- Source/channel: GT, MT, Shopee, TikTok Shop 1, TikTok Shop 2.
- Include/exclude cancelled toggle.
- Metric toggle: Booked GMV, Active GMV, Paid Amount, Refund, Quantity, Orders, AOV.
- Regional Manager, Area Manager.
- Province, city, district.
- SKU, product, IP, pack size, SKU type.
- Order status, payment status, fulfillment status, marketplace status.


### 6.3 Dashboard Pages & Required Charts

| Page | Purpose | Required Visualizations |
| --- | --- | --- |
| Executive Overview | Satu halaman ringkasan omnichannel. | KPI cards; Donut chart channel contribution; Multi-line daily GMV; Stacked bar GMV by channel/status; Combo chart GMV + orders; Top SKU bar; Cancellation alert cards. |
| GT Performance | Halaman utama General Trade. | Lollipop chart Area Manager GMV; Grouped bar Regional vs Area; Bubble chart GMV vs Orders with Qty bubble; Heatmap Region × SKU; Pareto SKU contribution; Table manager leaderboard. |
| MT / Agency Performance | Monitoring Modern Trade / Agency rows. | Bar chart Agency GMV; Donut SKU mix; Combo booked vs active GMV; Status funnel; Top bulk SKU table; cancellation/refund cards. |
| Marketplace Comparison | Bandingkan Shopee, TikTok Shop 1, TikTok Shop 2. | Grouped bar shop GMV/orders; Multi-line daily GMV by shop; Funnel status by shop; Donut cancellation share; Scatter AOV vs cancellation rate; Refund waterfall. |
| SKU & Product Analytics | Melihat performa produk lintas channel. | Horizontal bar top SKU; Treemap SKU/IP contribution; Bubble chart Qty vs GMV; Lollipop top growth/drop; Pie/donut by SKU type; Matrix SKU × channel. |
| Geo Sales | Melihat kota/provinsi penjualan. | Map / geo bubble; Bar top province/city; Heatmap city × channel; Drilldown location table. |
| Operations & Fulfillment | Monitoring order status, shipping, pending, cancelled. | Stacked status bar; Line pending/cancelled trend; Funnel order lifecycle; Aging table; Refund and cancel reason charts. |
| Customer / Buyer Analytics | Melihat customer/reseller/buyer contribution. | Top customer bar; RFM scatter; Repeat buyer table; New vs repeat line chart; Customer concentration Pareto. |
| Data Quality | Memastikan upload valid. | Validation KPI; Missing fields bar; Duplicate order table; Zero-value item table; Schema mismatch table. |
| AI Insight Center | Q&A, auto-generated insights, narrative BI. | Chat UI; generated SQL preview; answer cards; downloadable query results; chart suggestion based on user question. |

### 6.4 Chart Library Must Support

- Bar chart, horizontal bar chart, stacked bar chart, grouped bar chart.

- Lollipop chart for manager ranking.

- Combo chart: GMV bar + order count line, or Active GMV bar + cancellation rate line.

- Line chart and multi-line chart for trend by day/source/manager.

- Pie chart and donut chart for contribution mix.

- Scatter plot and bubble chart for GMV, orders, quantity, AOV, cancellation rate.

- Treemap for SKU/IP/product contribution.

- Heatmap for manager × SKU, location × channel, status × day.

- Funnel chart for order lifecycle.

- Waterfall chart for gross GMV → discount → refund → active/net GMV.

- Geo map or province/city bubble map.

- Data table with column freeze, sorting, search, grouping, subtotal, and export.


---

## 7. AI Chatbot Requirements

### 7.1 Chatbot Capabilities

- Menjawab pertanyaan berbasis data upload dengan metric dictionary yang konsisten.

- Menghasilkan SQL yang aman hanya ke analytics mart / semantic layer, bukan langsung ke raw PII table.

- Menampilkan jawaban berupa narasi, tabel, dan chart rekomendasi.

- Bisa menjelaskan rumus: “GMV ini dari mana?”, “Kenapa order count tidak sama dengan row count?”, “Kenapa SKU gift dikeluarkan?”

- Bisa membuat insight otomatis: top drivers, anomalies, cancellation spike, SKU mix shift, manager gap, marketplace risk.

- Bisa download hasil query ke CSV/XLSX.


### 7.2 Example User Questions

```text
Berapa total GMV GT bulan April berdasarkan kolom AV?
Area Manager mana yang paling tinggi GMV dan quantity?
Bandingkan performa Nur Setyo Aji vs Hakim Abdul Aziz.
SKU apa yang paling besar kontribusinya di MT?
Berapa cancellation rate TikTok Shop 2?
Tampilkan top 10 kota dengan GMV terbesar.
Apakah ada order cancelled yang masih punya GMV besar?
Buat chart bubble GMV vs order count by Area Manager.
Download semua order GT milik Riky Marojahan Hasibuan.
```


### 7.3 Guardrails

- AI harus selalu menyebutkan filter yang dipakai: date range, source, status inclusion, GMV type.

- AI tidak boleh menjumlah order-level repeated fields tanpa deduplication.

- AI harus memakai `SKUGMV sku gmv` untuk B2B GMV kecuali user eksplisit memilih metric lain.

- AI harus default menampilkan active/non-cancelled untuk performance, tetapi tetap bisa menampilkan booked GMV atas permintaan user.

- AI harus menandai hasil sebagai “belum final” jika upload belum lengkap atau schema mismatch.


---

## 8. Download & Export Requirements

- Download cleaned unified transaction data: CSV/XLSX.

- Download per dashboard widget: CSV data, PNG chart, PDF snapshot.

- Download executive summary report: PDF dan PPT-ready image pack.

- Download manager performance report: per Regional Manager dan Area Manager.

- Download SKU mapping exceptions: SKU alias yang belum match canonical SKU.

- Download AI query result: CSV/XLSX plus generated SQL and filter context.

- Export should preserve filters currently active in dashboard.


---

## 9. Suggested Tech Stack

| Layer | Recommended Stack | Notes |
| --- | --- | --- |
| Frontend | Next.js + React + TypeScript | Clean dashboard UI, server components, fast routing. |
| UI | Tailwind CSS + shadcn/ui | Premium clean components, cards, tables, dialogs. |
| Charts | ECharts or Apache Superset-style custom components; optionally Recharts for simpler pages | ECharts has strong support for lollipop/custom, heatmap, treemap, funnel, map, combo. |
| Backend | NestJS/FastAPI/Next.js API routes | File upload, processing queue, auth, API. |
| Database | PostgreSQL | Relational model + JSONB raw payload. |
| Warehouse/Mart | PostgreSQL materialized views or DuckDB for local processing | Fast analytics for uploaded batch. |
| Queue | BullMQ/Redis or Celery/RQ | Async ingestion and heavy parsing. |
| File Storage | S3-compatible storage / local object storage | Keep original uploaded file for audit. |
| AI Layer | LLM + semantic SQL layer + vector store optional | Chatbot with metric dictionary and data lineage. |
| Export | ExcelJS / SheetJS, Playwright PDF, chart image export | Download CSV/XLSX/PDF/PNG. |

---

## 10. Non-Functional Requirements

- Upload should handle at least 100k line-items per file for V1, scalable to 1M+ rows in V2.

- Dashboard initial load target under 3 seconds after processing, using pre-aggregated materialized views.

- Processing job must show progress: uploaded, parsed, validated, transformed, aggregated, ready.

- All metrics must be reproducible from raw file using upload batch ID and transformation logs.

- Role-based access control must protect PII fields like phone, address, recipient.

- Every export must record audit log.

- System must support re-upload/reprocessing of the same period without duplicating data.

- System must detect duplicate file hash and ask whether to replace existing batch.


---

## 11. Acceptance Criteria

1. User can upload the four files and see processing success/failure per file.

2. B2B rows with `Area Manager = Agency` are classified as MT; other rows as GT.

3. GT dashboard prominently displays Regional Manager and Area Manager performance using GMV from column AV.

4. Order count is deduped and does not equal raw line-item count unless one order has one item.

5. Dashboard can toggle Booked GMV vs Active GMV.

6. Marketplace zero-value gift lines are flagged and can be included/excluded from SKU analysis.

7. User can filter every dashboard by date, channel, shop, manager, location, SKU, and status.

8. User can drill down from any chart to the underlying order/SKU table.

9. User can ask AI chatbot at least 20 business questions and receive accurate answers using the same metric definitions.

10. User can download data and charts after applying filters.

11. Data Quality page shows duplicate order rows, missing fields, invalid numbers, unmatched SKU aliases, and cancelled GMV.

12. All results are tied to upload batch ID for audit and reproducibility.


---

## 12. Implementation Roadmap

### Phase 1 — MVP / V1

- Upload center for 4 file types.
- Parser and transformation rules.
- PostgreSQL schema and ingestion pipeline.
- Executive overview, GT performance, marketplace comparison, SKU performance.
- CSV/XLSX download.
- Basic AI chatbot with predefined metrics and SQL templates.


### Phase 2 — V2

- SKU alias management UI.
- Advanced chart gallery: lollipop, heatmap, treemap, funnel, waterfall, geo map.
- Data quality exception workflow.
- Manager-level permission and personalized dashboards.
- PDF report export.


### Phase 3 — V3

- Forecasting, target vs achievement, anomaly detection.
- Automated executive summary generation per week/month.
- Scenario analysis: if cancellation reduced by X%, GMV impact.
- Scheduled ingestion from marketplace API if available.
- AI proactive alerts.


---

## 13. Open Questions / Decisions Needed

1. Apakah Shopee `Batal` dengan `Total Pembayaran = 0` harus tetap dihitung sebagai cancelled order dalam conversion rate? Rekomendasi: ya untuk order count, tidak untuk active GMV.

2. Apakah scratch card/POSM/display rack ingin dianggap revenue SKU atau supporting item? Rekomendasi: tag sebagai supporting item dan beri toggle.

3. Apakah target sales per Regional Manager/Area Manager tersedia? Jika ada, tambahkan Target Achievement dashboard.

4. Apakah MT “Agency” perlu dipecah berdasarkan nama agency/customer? File saat ini hanya menunjukkan `Agency` di field sales org, sehingga perlu master data agency jika ingin lebih detail.

5. Apakah marketplace order amount harus memakai gross GMV atau active net GMV setelah refund? Rekomendasi: tampilkan keduanya, dengan Active GMV sebagai default performance.
