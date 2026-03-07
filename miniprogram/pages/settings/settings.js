Page({
  data: {},

  onLoad() {},

  onLogout() {
    wx.showModal({
      title: "确认退出",
      content: "退出后需重新登录",
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync("token");
          wx.removeStorageSync("user");
          wx.reLaunch({ url: "/pages/login/login" });
        }
      },
    });
  },

  onBack() {
    wx.navigateBack();
  },
});
