PairCheck · 双表核对
版本：0.1.0 / 2026-10-13 / 作者：AkiraNyx

使用
1. 解压离线包，在支持 BigInt 和 TextDecoder 的现代浏览器中打开 index.html。
2. 点击“载入合成样例”体验，或选择两份逗号分隔 CSV。每份最多 5 MB、20,000 条记录。
3. 为每份 CSV 明确选择编号列和金额列，点击核对，按需导出异常 CSV。

离线包不需要网络。文件只在浏览器内存处理，不上传，不写入本地存储。
下载的报告仍保存在下载目录，请自行妥善保管。

核对约定
- 第一行是非空、唯一的表头；每条记录的列数必须一致。支持引号、逗号、转义引号和引号内换行。
- 编号去掉首尾空白，保留大小写、前导零和内部空格。重复、空编号会停止核对。
- 金额为纯十进制数，最多 24 位整数和 6 位小数。允许正负号，不允许千分位、货币符号、科学计数法。
- 金额以整数缩放比较，避免二进制浮点舍入。差额只在两侧都存在时给出，方向为左减右。
- 记录号含表头；多行字段仍计为一条记录，记录号不等于物理行号。
- 界面最多预览 100 条；导出含全部异常。导出对疑似公式文本加单引号以降低电子表格公式执行风险。
- 仅支持逗号分隔 CSV，第一版不读取 XLSX、分号分隔文件或聚合重复编号。
- 请自行确认币种、业务范围、时区、退款、手续费等口径。字段一致不代表平台结算正确。

商业状态
工具包免费使用。CSV 核对交付包为独立的本地 Agent 脚本与工作流商品，SkillPay 一次买断价为 ¥9.90；本网页工具及比较引擎免费。
交付包地址：https://skillpay.alipay.com/shelf/product?productId=P0806000208856320&merchantCode=akiranyx 。没有虚构客户案例或销售记录。

许可
Copyright (c) 2026 AkiraNyx

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
