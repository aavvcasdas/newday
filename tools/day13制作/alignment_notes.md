# 音频对齐说明

输入为用户给的 WAV，SHA256 `1891c4c7f9c08011ad420e85d1a5c08c343256bcd0a0c5044bd13c91d135bd4e`，40kHz、双声道、110.62s。原字节未改；此文件名不能证明实际配音引擎或说话人。

`asr_words.json` 是 Vosk `vosk-model-small-cn-0.22` 不改写输出（模型镜像 <https://github.com/kercre123/vosk-models> zip SHA256 `3af8b0e7e0f835ae9d414ce5df580237a3cfb08d586c9fbbb0f7ff29ad5b14ba`）。`align.py` 用用户文本及识别词的普通话拼音序列映射，外文名按常用读法映射，句首句尾结合原音 5ms RMS；未匹配的字映射到临近词并标 `neighbor`，并非逐字强制对齐。`subtitle_timing.json` 按语义短句从识别词区间计算；自动识别有“本金/本鲸”等错字及名字不确定，需人耳听审及复核实际字幕，不可声称已核实声线或音素精确。

用户后来明确删除“站着可不算演完了”，因此配音文本和字幕仅保留“得让她们动起来”；用户原稿其余文字完整保留、标点按语义分屏。生成参数、渲染与混音复现见 Day13 README。
