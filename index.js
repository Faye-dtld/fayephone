import { getContext } from "../../../extensions.js";
import {
    getBase64Async,
    saveBase64AsFile,
} from "../../../utils.js";

// 核心上传函数
async function adapterUpload(file) {
    if (!file) throw new Error("未检测到文件");

    console.log("[FayephoneSupport] 接收到文件:", file.name);

    // 1. 获取当前角色名 (文件会存入该角色的文件夹)
    const context = getContext();
    const charName = context.name || "UserUploads"; 

    // 2. 将文件转为 Base64 (用于保存API)
    const base64Full = await getBase64Async(file);
    const base64Data = base64Full.split(",")[1];
    
    // 3. 生成唯一文件名 (防止重名覆盖)
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `phone_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 4. 调用酒馆内部函数保存文件
    const savedPath = await saveBase64AsFile(
        base64Data,
        charName,
        fileName,
        ext
    );

    console.log("[FayephoneSupport] 文件保存成功:", savedPath);
    
    // 5. 返回路径给小手机
    return { url: savedPath };
}

// === 关键点 ===
// 将函数挂载到 window 对象上，这样 iframe 里面的小手机
// 就可以通过 window.parent.__fayePhoneSupport_upload 来调用它了
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (自定义版) 已加载成功！");
