export const appRoles = ["administrator", "head", "gt_mt", "marketplace"] as const;

export type AppRole = (typeof appRoles)[number];

export type PermissionKey =
  | "viewExecutive"
  | "viewGt"
  | "viewMt"
  | "viewMarketplace"
  | "viewIncome"
  | "viewSku"
  | "viewGeo"
  | "viewOperations"
  | "viewCustomers"
  | "viewUpload"
  | "viewDataQuality"
  | "viewAi"
  | "manageUsers"
  | "uploadData"
  | "wipeData"
  | "exportData"
  | "manageReference";

export type RolePermissionMap = Record<PermissionKey, boolean>;

export type ChannelKey = "gt" | "mt" | "shopee" | "tiktok1" | "tiktok2";

export const roleLabels: Record<AppRole, string> = {
  administrator: "Administrator",
  head: "Head",
  gt_mt: "GT & MT",
  marketplace: "Marketplace",
};

export const channelLabels: Record<ChannelKey, string> = {
  gt: "GT",
  mt: "MT",
  shopee: "Shopee",
  tiktok1: "TikTok Shop (Kayou ID)",
  tiktok2: "TikTok Shop (Kayou Card ID)",
};

export const permissionCatalog: Array<{
  key: PermissionKey;
  label: string;
  description: string;
  group: "Menu" | "Data" | "Administration";
}> = [
  { key: "viewExecutive", label: "Executive Overview", description: "Akses halaman overview lintas channel.", group: "Menu" },
  { key: "viewGt", label: "GT Performance", description: "Akses halaman performa General Trade.", group: "Menu" },
  { key: "viewMt", label: "MT / Agency", description: "Akses halaman Modern Trade dan agency.", group: "Menu" },
  { key: "viewMarketplace", label: "Marketplace", description: "Akses halaman Marketplace Sales Performance.", group: "Menu" },
  { key: "viewIncome", label: "Income & Settlement", description: "Akses settlement dan released payment.", group: "Menu" },
  { key: "viewSku", label: "SKU & Product", description: "Akses analitik SKU dan produk.", group: "Menu" },
  { key: "viewGeo", label: "Geo Sales", description: "Akses analitik peta dan wilayah.", group: "Menu" },
  { key: "viewOperations", label: "Operations", description: "Akses monitoring status order dan fulfilment.", group: "Menu" },
  { key: "viewCustomers", label: "Customers", description: "Akses analitik customer sesuai scope role.", group: "Menu" },
  { key: "viewUpload", label: "Upload Center", description: "Akses halaman upload dan pengelolaan file.", group: "Menu" },
  { key: "viewDataQuality", label: "Data Quality", description: "Akses validasi dan health data.", group: "Menu" },
  { key: "viewAi", label: "AI Chatbot", description: "Akses AI insight center.", group: "Menu" },
  { key: "manageUsers", label: "User Management", description: "Menambah user dan mengubah permission role.", group: "Administration" },
  { key: "uploadData", label: "Upload Data", description: "Mengunggah dan mengganti dataset channel.", group: "Data" },
  { key: "wipeData", label: "Wipe Data", description: "Menghapus seluruh data dashboard.", group: "Data" },
  { key: "exportData", label: "Export Data", description: "Mengunduh cleaned dataset.", group: "Data" },
  { key: "manageReference", label: "Reference Data", description: "Menjalankan bootstrap dan normalisasi referensi.", group: "Administration" },
];

const allTrue = Object.fromEntries(permissionCatalog.map((permission) => [permission.key, true])) as RolePermissionMap;

export const defaultRolePermissions: Record<AppRole, RolePermissionMap> = {
  administrator: { ...allTrue },
  head: {
    ...allTrue,
    manageUsers: false,
  },
  gt_mt: {
    viewExecutive: true,
    viewGt: true,
    viewMt: true,
    viewMarketplace: false,
    viewIncome: false,
    viewSku: true,
    viewGeo: true,
    viewOperations: true,
    viewCustomers: true,
    viewUpload: false,
    viewDataQuality: true,
    viewAi: true,
    manageUsers: false,
    uploadData: false,
    wipeData: false,
    exportData: true,
    manageReference: false,
  },
  marketplace: {
    viewExecutive: true,
    viewGt: false,
    viewMt: false,
    viewMarketplace: true,
    viewIncome: true,
    viewSku: true,
    viewGeo: true,
    viewOperations: true,
    viewCustomers: true,
    viewUpload: false,
    viewDataQuality: true,
    viewAi: true,
    manageUsers: false,
    uploadData: false,
    wipeData: false,
    exportData: true,
    manageReference: false,
  },
};

export function normalizeRole(value?: string | null): AppRole {
  return appRoles.includes(value as AppRole) ? (value as AppRole) : "gt_mt";
}

export function mergeRolePermissions(role: AppRole, custom?: Partial<Record<PermissionKey, boolean>> | null): RolePermissionMap {
  return {
    ...defaultRolePermissions[role],
    ...(custom ?? {}),
  };
}

export const pagePermissionMap: Array<{ path: string; permission: PermissionKey }> = [
  { path: "/", permission: "viewExecutive" },
  { path: "/gt", permission: "viewGt" },
  { path: "/mt", permission: "viewMt" },
  { path: "/marketplace", permission: "viewMarketplace" },
  { path: "/income", permission: "viewIncome" },
  { path: "/sku", permission: "viewSku" },
  { path: "/geo", permission: "viewGeo" },
  { path: "/operations", permission: "viewOperations" },
  { path: "/customers", permission: "viewCustomers" },
  { path: "/upload", permission: "viewUpload" },
  { path: "/data-quality", permission: "viewDataQuality" },
  { path: "/ai", permission: "viewAi" },
  { path: "/users", permission: "manageUsers" },
];

export function permissionForPath(pathname: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return pagePermissionMap.find((item) => item.path === normalizedPath)?.permission ?? "viewExecutive";
}

export function canAccessPath(pathname: string, permissions: RolePermissionMap) {
  return Boolean(permissions[permissionForPath(pathname)]);
}

export function firstAllowedPath(permissions: RolePermissionMap) {
  return pagePermissionMap.find((item) => permissions[item.permission])?.path ?? "/";
}

export function allowedChannelKeysForRole(role: AppRole): ChannelKey[] {
  if (role === "gt_mt") return ["gt", "mt"];
  if (role === "marketplace") return ["shopee", "tiktok1", "tiktok2"];
  return ["gt", "mt", "shopee", "tiktok1", "tiktok2"];
}

export function filterAllowedChannels(channels: string[], role: AppRole) {
  const allowed = allowedChannelKeysForRole(role);
  const selected = channels.filter((channel): channel is ChannelKey => allowed.includes(channel as ChannelKey));
  return selected.length ? selected : allowed;
}

export function channelKeyFromOrder(input: {
  channelGroup?: string | null;
  sourceSystem?: string | null;
  shopAccount?: string | null;
}) {
  if (input.channelGroup === "GT") return "gt";
  if (input.channelGroup === "MT") return "mt";
  if (input.sourceSystem === "shopee") return "shopee";
  if (input.sourceSystem === "tiktok_shop") {
    return input.shopAccount?.toLowerCase().includes("card") ? "tiktok2" : "tiktok1";
  }
  return null;
}
