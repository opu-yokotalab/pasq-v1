○ファイル構成
・JavaScript部分を外部ファイルに
・メインのpasq-core.js、Google Maps API関連のpasq-map.js

○動作関連
・近傍パンラマ情報は必須
・起動時にPTViewer側に全てのデータを渡していたのを
　切替時に必要なものだけ渡すように変更
・↑によりコンテンツ情報からのhotspot生成等が可能に