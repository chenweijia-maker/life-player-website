function getApiBaseUrl() {
  const app = getApp();
  const stored = wx.getStorageSync("api_base_url");
  return (stored || (app && app.globalData && app.globalData.defaultApiBaseUrl) || "").trim();
}

function buildUrl(path) {
  let p = String(path || "");
  if (p.startsWith("/")) p = p.slice(1);
  if (!p.startsWith("api/")) p = "api/" + p;

  const base = getApiBaseUrl();
  if (!base) return "/" + p;
  return base.replace(/\/+$/, "") + "/" + p;
}

function request(method, path, { data, headers } = {}) {
  const token = wx.getStorageSync("token");
  const h = Object.assign(
    { "content-type": "application/json" },
    token ? { Authorization: "Bearer " + token } : {},
    headers || {}
  );

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path),
      method,
      data,
      header: h,
      success: (res) => resolve(res),
      fail: (err) => reject(err),
    });
  });
}

function get(path, opts) {
  return request("GET", path, opts);
}

function post(path, opts) {
  return request("POST", path, opts);
}

module.exports = {
  buildUrl,
  request,
  get,
  post,
};

