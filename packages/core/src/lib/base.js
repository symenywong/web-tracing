import { uuid, sendBeacon, map, nextTime, getCookieByName } from '../utils/methods';
import device from '../utils/device';
import { getSessionId, refreshSession } from '../utils/session';
import { DEBUG_LOG, MAX_CACHE_LEN, MAX_WAITING_TIME, DISTINCT_KEY, USER_KEY } from '../utils/constant';
import { version } from '../../package.json'

// 当前应用ID,在整个页面生命周期内不变,单页应用路由变化也不会改变,加载SDK时创建,且只创建一次

// 与一般业务上理解的sessionId做区分,此session与业务无关,单纯就是浏览器端和后端直接的联系
const $session_id = getSessionId();
const $distinct_id = '';
const userId = getCookieByName(USER_KEY);

let request_url = ''; // 服务请求地址
let events = []; // 批次队列
let timer = null; // 定时发送定时器
let _track_id = null;
const base = { // 基础数据
  ...device,
  $distinct_id,
  $session_id,
  userId,
  $lib_version: version,
};
let _appId = '';
let _appSecret = '';
/**
 * 初始化基础数据
 * @param {*} options 基础配置
 */
function init(options = {}) {
  const { app_name, ext, debug, appId, appSecret, _track_id } = options;
  _appId = appId;
  _appSecret = appSecret;
  request_url = options.request_url;
  base.$app_name = app_name;
  base.$app_id = appId;
  base.debug = debug;
  base._track_id = _track_id;
  if (ext) {
    for (let key in ext) {
      base[key] = ext[key];
    }
  }
}

/**
 * 记录需要发送的埋点数据
 * @param {*} e 需要发送的事件信息
 * @param {boolean} flush 是否立即发送
 */
function emit(e, flush = false) {
  events = events.concat(e); // 追加到事件队列里
  refreshSession();
  debug('receive event, waiting to send', e);
  clearTimeout(timer);

  // 满足最大记录数,立即发送,否则定时发送(flush为true代表立即发送)
  events.length >= MAX_CACHE_LEN || flush
    ? send()
    : timer = setTimeout(() => { send(); }, MAX_WAITING_TIME);
}

/**
 * 发送埋点信息
 */
function send() {
  if (events.length) {
    // 选取首部的部分数据来发送,performance会一次性采集大量数据追加到events中
    const sendEvents = events.slice(0, MAX_CACHE_LEN); // 需要发送的事件
    events = events.slice(MAX_CACHE_LEN); // 剩下待发的事件
    debug('send events', sendEvents);
    const time = Date.now();
    const send_type = base.$send_type;
    const _track_id = base._track_id;
    delete base._track_id;
    let data = {
      base: { ...base },
      events: map(sendEvents, (e) => {
        e._track_id = _track_id;
        e.ext.$send_time = time; // 设置发送时间
        // 补充type字段,将click、scroll、change、submit事件作为一类存储
        if (e.$event === 'click' || e.$event === 'scroll' || e.$event === 'submit' || e.$event === 'change') {
          e.$type = 'default_event';
          return e;
        }

        if (e.$event === 'performance') {
          // 将性能进行分类,不同类型的性能数据差异较大,分开存放,资源、页面、请求
          e.$type = 'performance';
          return e;
        }
        e.$type = e.$type || 'custom_event'
        return e;
      }),
    }

    let _str = window.btoa(JSON.stringify(data));
    console.log(data);
    sendBeacon(request_url, {
      _appId,
      _appSecret,
      _str,
    }, send_type);
    if (events.length) nextTime(send); // 继续传输剩余内容,在下一个时间择机传输
  }
}

/**
 * 设置额外的 customerId
 * @param {*} id 需要设置的id
 */
function setCustomerId(id) {
  base.customerId = id;
}

/**
 * 设置额外的 userUuid
 * @param {*} id 需要设置的id
 */
function setUserId(id) {
  // 登录后, distinct_id 也变为userID, 未登录情况下, userID="", distinct_id为sessionId,
  base.userId = id;
  base.$distinct_id = id;
  document.cookie = `${USER_KEY}=${id};path=/;expires=Fri, 31 Dec 2030 23:59:59 GMT`;
}

/**
 * 生成distinct_id
 */
function setDistinctId(distinct_id) {
  const id = distinct_id || $session_id;
  base.$distinct_id = id;
}

/**
 * 控制台输出信息
 * @param  {...any} args 输出信息
 */
function debug(...args) {
  if (base.debug) console.log(...args);
}

export {
  emit,
  debug,
};

export default {
  init,
  emit,
  setCustomerId,
  setUserId,
  setDistinctId
};

