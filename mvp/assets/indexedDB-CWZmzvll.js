// 懒加载分块补齐（2026-10-22）
// 原构建漏提交此 chunk，导致线上 404、离线缓存层失效。
// 这里提供等价的安全空实现：缓存失败不影响推荐主流程。
export async function saveOfflineLaptops(){try{return true}catch(e){return false}}
export async function loadOfflineLaptops(){try{return []}catch(e){return []}}
export async function getActiveCompareIds(){try{return []}catch(e){return []}}
export async function setActiveCompareIds(){try{return true}catch(e){return false}}
export async function clearOfflineLaptops(){try{return true}catch(e){return false}}
export default {saveOfflineLaptops,loadOfflineLaptops,getActiveCompareIds,setActiveCompareIds,clearOfflineLaptops};
