import { DEVICE_KEY } from './constant'
import { getCookieByName, uuid } from './methods';

const { screen } = window;
const { clientWidth, clientHeight } = document.documentElement;
const { width, height, colorDepth, pixelDepth } = screen;

let deviceId = getCookieByName(DEVICE_KEY);

if (!deviceId) {
  deviceId = `t_${uuid()}`;
  document.cookie = `${DEVICE_KEY}=${deviceId};path=/;expires=Fri, 31 Dec 2030 23:59:59 GMT`;
}

export default {
  $client_height: clientHeight, // 网页可见区高度
  $client_width: clientWidth, // 网页可见区宽度
  // colorDepth, // 显示屏幕调色板的比特深度
  // pixelDepth, // 显示屏幕的颜色分辨率
  $browser_id: deviceId, // id
  $screen_width: width, // 显示屏幕的宽度
  $screen_height: height, // 显示屏幕的高度
  // vendor: navigator.vendor, // 浏览器名称
  $browser_version: navigator.appVersion,
  $platform: navigator.platform, // 浏览器平台的环境,不是电脑系统的x64这样的(浏览器平台的环境可能是x32)
};
