import { getContext } from "../../../extensions.js";
import {
    getBase64Async,
    saveBase64AsFile,
} from "../../../utils.js";

// 核心上传函数
async function adapterUpload(file, targetCharName) {
    if (!file) throw new Error("未检测到文件");

    console.log("[FayephoneSupport] 接收到文件:", file.name);

    // 1. 获取当前角色名 (文件会存入该角色的文件夹)
    // 优先使用传入的角色名 (来自UI)，如果未定义或为占位符，则尝试从环境获取
    let charName = targetCharName;
    
    if (!charName || charName === '{{char}}') {
        // 策略A: 优先使用全局变量 this_chid (当前选中的角色ID)
        // 这是最直接获取当前聊天对象的方法，适用于大多数情况
        if (typeof window.this_chid !== 'undefined' && 
            window.characters && 
            window.characters[window.this_chid]) {
            charName = window.characters[window.this_chid].name;
            console.log("[FayephoneSupport] 使用全局 this_chid 获取角色名:", charName);
        }
        // 策略B: 尝试从 context 获取 (备用)
        else {
            const context = getContext();
            if (context) {
                if (typeof context.characterId !== 'undefined' && 
                    window.characters && 
                    window.characters[context.characterId]) {
                    charName = window.characters[context.characterId].name;
                } 
                // 注意：不再回退到 context.name，因为它通常是扩展本身的名字
            }
        }
    }

    // 移除 UserUploads 兜底，因为用户明确要求不要有
    if (!charName) {
        throw new Error("无法获取当前角色名，请确保已在酒馆中选择了一个角色。");
    }

    // 关键修复：清理角色名中的非法文件字符，防止保存失败
    charName = charName.replace(/[\\/:*?"<>|]/g, "_");

    // 2. 将文件转为 Base64 (用于保存API)
    const base64Full = await getBase64Async(file);
    const base64Data = base64Full.split(",")[1];
    
    // 3. 生成唯一文件名 (防止重名覆盖)
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `phone_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 4. 调用酒馆内部函数保存文件
    // 这通常会保存到 User/images/charName/ 目录下
    const savedPath = await saveBase64AsFile(
        base64Data,
        charName,
        fileName,
        ext
    );

    console.log("[FayephoneSupport] 文件保存成功:", savedPath);
    
    // 5. 格式化路径为 /user/images/角色名/文件名
    // savedPath 通常是 "User/images/CharName/file.png"
    let finalUrl = savedPath;
    // 确保以 / 开头
    if (!finalUrl.startsWith('/')) finalUrl = '/' + finalUrl;
    // 强制将开头的 /User/ 替换为 /user/ 以满足格式要求
    finalUrl = finalUrl.replace(/^\/User\//, '/user/');

    return { url: finalUrl };
}

// === 关键点 ===
// 将函数挂载到 window 对象上，这样 iframe 里面的小手机
// 就可以通过 window.parent.__fayePhoneSupport_upload 来调用它了
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (自定义版) 已加载成功！");
