const { post } = require("../../utils/request");

Page({
  data: {
    agreed: false,
    loading: false,
    guestLoading: false,
    enableGuest: true, // 上线前改为 false
    error: "",
    hint: "",
  },

  onAgreeChange(e) {
    const checked = (e.detail.value || []).includes("agree");
    this.setData({ agreed: checked });
  },

  onTapUserAgreement() {
    wx.showToast({ title: "请添加用户协议页面", icon: "none" });
  },

  onTapPrivacy() {
    wx.showToast({ title: "请添加隐私政策页面", icon: "none" });
  },

  async onGetPhoneNumber(e) {
    if (!this.data.agreed) {
      wx.showToast({ title: "请先勾选同意协议", icon: "none" });
      return;
    }
    if (!e || !e.detail || e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({ title: "未授权手机号，无法登录", icon: "none" });
      return;
    }

    this.setData({ loading: true, error: "", hint: "" });
    try {
      const loginRes = await wx.login();
      if (!loginRes.code) throw new Error("wx.login 无 code");

      const res = await post("auth/wx-login", {
        data: {
          code: loginRes.code,
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv,
        },
      });
      const data = (res && res.data) || {};
      if (!data.success) {
        this.setData({ error: data.error || "登录失败" });
        return;
      }

      wx.setStorageSync("token", data.token);
      if (data.user) wx.setStorageSync("user", data.user);
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (err) {
      console.error(err);
      this.setData({ error: "无法连接后端，请稍后再试" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onGuestLogin() {
    this.setData({ guestLoading: true, error: "", hint: "" });
    try {
      const loginRes = await wx.login();
      const res = await post("auth/wx-login-test", { data: { code: loginRes.code } });
      const data = (res && res.data) || {};
      if (!data.success) {
        this.setData({ error: data.error || "游客登录失败" });
        return;
      }
      wx.setStorageSync("token", data.token);
      if (data.user) wx.setStorageSync("user", data.user);
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (e) {
      console.error(e);
      this.setData({ error: "游客登录失败，请检查后端" });
    } finally {
      this.setData({ guestLoading: false });
    }
  },
});

