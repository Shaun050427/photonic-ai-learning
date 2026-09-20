# 光计算与光生成模型学习系统

第一阶段的可直接阅读的学习站点与可运行实验。站点入口为 `index.html`，内容覆盖复振幅、干涉、衍射、Fresnel / Fraunhofer、角谱传播、4f、相位掩膜、MZI、非线性、采样与十天练习。

## 阅读与实践

1. 打开站点首页，按照左侧知识地图和十天计划学习。
2. 在本机安装 Python 3.10+，执行 `python -m pip install -r requirements.txt`。
3. 执行 `python experiments/foundations.py --output results`，程序生成干涉、传播、相位掩膜、衍射与频域滤波图像。`results/` 已排除在版本库之外。
4. 执行 `python -m unittest discover -s tests` 检查角谱传播的基本数值性质。

实验代码采用标量、相干、单色光近似，FFT 对应有限的周期计算窗口。真实器件还涉及孔径、像差、偏振、噪声、损耗以及采样边界；不能把这份练习的输出直接当作实验器件预测。

## 发布

`.github/workflows/pages.yml` 在推送到 `main` 后，把仓库根目录发布为 GitHub Pages。创建仓库后，在 **Settings → Pages → Build and deployment** 将来源设为 **GitHub Actions**。首次发布可在仓库的 **Actions** 标签页查看结果。

此仓库只适合放公开教材和代码。个人笔记、实验数据、访问令牌等不要提交到公开仓库。今后若需要跨设备同步私人学习进度，可另外设计私有数据仓库；当前页面不声称具备该功能。

## 目录

- `index.html`：原有中文学习手册，作为 Pages 首页。
- `experiments/foundations.py`：五个独立可运行的基础实验。
- `tests/test_foundations.py`：数值传播与相位掩膜检查。
- `.github/workflows/pages.yml`：静态站点部署。

后续阶段可以按 `02-d2nn/`、`03-generative/` 添加课程，再在首页导航中接入。
