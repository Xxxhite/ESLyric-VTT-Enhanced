# eslyric-vtt-enhanced

这是一个针对 Foobar2000 歌词插件 **ESLyric** 的 `.vtt` 字幕解析脚本的修复与增强版本。

## ⚠️ 鸣谢与原作者声明

本脚本的核心功能与基础逻辑完全归功于原作者 **onetiaoxianfish**。
本仓库仅提供针对部分解析 Bug 的修复与容错增强版本。

* **原作者**: onetiaoxianfish
* **原项目仓库地址**: [点击这里访问原仓库](<https://github.com/onetiaoxianfish/ESLyric-VTT>)

关于 ESLyric 插件的详细配置方法、其他格式的支持以及完整的文档说明，**请务必前往原作者的仓库查看**。

## 🐛 本版本解决了什么问题？

原脚本在解析某些特定格式的 `.vtt`（WebVTT）文件时，会触发 `TypeError: cannot read property 'split' of undefined` 报错并导致歌词加载失败。本版本针对该问题及潜在的格式兼容问题进行了重写与优化，主要改进如下：

1. **增强换行符兼容性**：统一处理了 Windows (`\r\n`) 与类 Unix (`\n`) 的换行符差异，防止因空白块读取错位导致的崩溃。
2. **动态时间轴定位**：原脚本假定时间轴固定在每个文本块的第二行。修复版改为动态检索包含 `-->` 符号的行，从而**完美兼容带有“数字序号”的标准 VTT 文件**。
3. **时间戳容错提升**：优化了 `toTimeStamp` 函数，增强了在遇到非标准时间戳（如缺失小时数）时的健壮性。
4. **剔除冗余参数**：标准 VTT 允许在时间轴后附加定位参数（如 `align:start`）。由于其中包含冒号，会破坏原版切割时间的逻辑。修复版只提取纯时间字符串，保证了解析稳定性。
5. **内联标签清洗**：自动使用正则表达式过滤 VTT 文本中的样式及发言人标签（如 `<b>`, `<v Singer>` 等），确保在纯文本歌词插件（ESLyric）中不显示乱码。同时屏蔽了 `NOTE`（注释）和 `STYLE`（样式）区块。

## 🚀 使用方法

本脚本仅作为原脚本 `vttrc.js` 的替代品。

1. 按照 **[原作者仓库](<https://github.com/onetiaoxianfish/ESLyric-VTT>)** 中的说明，完成 ESLyric 及 VTT 解析环境的初始搭建。
2. 下载本仓库中的 `vttrc.js` 文件。
3. 替换掉你本地对应的同名原文件。**根据你的 Foobar2000 安装方式和版本，路径会有所不同：**

   * **Foobar2000 v2.x (标准安装)**: 
     按下 `Win + R`，输入 `%appdata%\foobar2000-v2\eslyric-data\scripts\parser` 并回车。
   * **Foobar2000 v1.x (标准安装)**: 
     按下 `Win + R`，输入 `%appdata%\foobar2000\eslyric-data\scripts\parser` 并回车。
   * **便携版安装 (Portable)**: 
     打开 Foobar2000 安装目录，进入 `profile\eslyric-data\scripts\parser\`。

4. 放入文件后，**重启 Foobar2000** 即可生效。