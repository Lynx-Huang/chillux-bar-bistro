# POC 資料格式與流程說明

## 📋 目錄

1. [資料格式](#資料格式)
2. [流程](#流程)

---

## 🎯 資料格式

### 1. **AudioStreamMessage**
> **用途：** WebSocket過程中，Client 到 Server的資訊

```typescript
interface AudioStreamMessage {
  type: 'frontend-audio-chunk' | 'ping' | 'pong' | 'ack' | 'error'  // 訊息類型
  timestamp: string           // 伺服器時間戳記（ISO格式）
  clientId: string           // 客戶端唯一識別碼
  messageId?: string         // 訊息ID（用於確認機制）
  data?: any                // 訊息內容資料
}
```

**範例資料：**
```json
{
  "type": "frontend-audio-chunk",
  "timestamp": "2024-11-19T10:30:00.000Z",
  "clientId": "client_1732012340000_abc123",
  "messageId": "msg_1732012345678_def456",
  "data": {
    "chunk": { /* AudioChunk 物件 */ },
    "taskId": "task_1732012340000_xyz789"
  }
}
```

### 2. **AudioChunk**
> **用途：** 錄音過程，依據設定秒數切分的音訊資料API傳遞實際 payload

```typescript
interface AudioChunk {
  id: string                    // 音訊塊唯一識別碼
  sequenceNumber: number        // 順序編號，確保音訊按序合併
  data: string                 // Base64 編碼音訊數據
  status: AudioChunkStatus     // 當前處理狀態
  timestamp: number            // 創建時間戳記（毫秒）
  duration: number             // 音訊實際時長（秒）
  taskId: string              // 任務識別碼，關聯錄音會話
  format: string              // 音訊格式（webm/wav）
  size: number                // 音訊資料大小（bytes）
  metadata?: {                // 額外資訊
    isPartial?: boolean       // 是否為部分音訊塊（暫停時產生）
    sampleRate?: number       // 採樣率
    channels?: number         // 聲道數
    bitRate?: number          // 位元率
  }
}

enum AudioChunkStatus {
  PENDING = 'PENDING',       // 音訊塊待發送
  SENT = 'SENT',            // 已發送至伺服器
  RECEIVED = 'RECEIVED',    // 伺服器確認接收
  PROCESSED = 'PROCESSED',  // 伺服器處理完成
  ERROR = 'ERROR'           // 處理過程發生錯誤
}
```

**範例資料：**
```json
{
  "id": "chunk_1732012345678_abc123",
  "sequenceNumber": 1,
  "data": "data:audio/webm;codecs=opus;base64,UklGRiQ...",
  "status": "SENT",
  "timestamp": 1732012345678,
  "duration": 3.0,
  "taskId": "task_1732012340000_xyz789",
  "format": "webm",
  "size": 64796,
  "metadata": {
    "isPartial": false,
    "sampleRate": 48000,
    "channels": 1,
    "bitRate": 128000
  }
}
```

### 3. **AudioStreamConfig**
> **用途：** 提供專案「音訊格式描述」，大部分來自原生的MediaStream

```typescript
interface AudioStreamConfig {
  // MediaStream 配置
  mediaConstraints: MediaStreamConstraints  // 媒體約束條件
  deviceId?: string                        // 指定音訊裝置ID
  
  // MediaRecorder 配置
  mimeType: string                        // MIME類型 (audio/webm, audio/wav)
  audioBitsPerSecond?: number             // 音訊位元率
  
  // 自訂配置
  chunkInterval: number                   // 音訊切分間隔（毫秒）
  maxChunkSize?: number                   // 最大音訊塊大小
  enableEchoCancellation: boolean         // 回音消除
  enableNoiseSuppression: boolean         // 雜訊抑制
  enableAutoGainControl: boolean          // 自動增益控制
  
  // WebSocket 配置
  serverUrl: string                       // WebSocket 伺服器位址
  reconnectInterval: number               // 重連間隔（毫秒）
  maxReconnectAttempts: number           // 最大重連次數
  heartbeatInterval: number              // 心跳間隔（毫秒）
}
```

**範例資料：**
```json
{
  "mediaConstraints": {
    "audio": {
      "echoCancellation": true,
      "noiseSuppression": true,
      "autoGainControl": true,
      "sampleRate": 48000,
      "channelCount": 1
    }
  },
  "deviceId": "default",
  "mimeType": "audio/webm;codecs=opus",
  "audioBitsPerSecond": 128000,
  "chunkInterval": 3000,
  "maxChunkSize": 1048576,
  "enableEchoCancellation": true,
  "enableNoiseSuppression": true,
  "enableAutoGainControl": true,
  "serverUrl": "ws://localhost:8080/audio-stream",
  "reconnectInterval": 2000,
  "maxReconnectAttempts": 20,
  "heartbeatInterval": 5000
}
```

---

## 🔄 流程

### 1. **連線建立流程**
> **用途：** 開始錄音前，包含心跳機制、狀態監控初始化

#### 🚀 流程步驟

1. **初始化 AudioStreamConfig**
   ```typescript
   // 載入音訊串流配置
   const config = loadAudioStreamConfig()
   ```

2. **WebSocket 連線建立**
   ```typescript
   // 建立 WebSocket 連線
   connectionState = WebSocketConnectionState.CONNECTING
   websocket = new WebSocket(config.serverUrl)
   ```

3. **連線成功處理**
   ```typescript
   websocket.onopen = () => {
     connectionState = WebSocketConnectionState.CONNECTED
     startHeartbeat()  // 啟動心跳機制
     initializeStatusMonitoring()  // 初始化狀態監控
   }
   ```

4. **心跳機制啟動**
   ```typescript
   setInterval(() => {
     sendMessage({
       type: 'ping',
       timestamp: new Date().toISOString(),
       clientId: clientId
     })
   }, config.heartbeatInterval)
   ```

5. **狀態監控初始化**
   ```typescript
   // 初始化連線統計
   connectionStats = {
     reconnectCount: 0,
     connectionState: 'CONNECTED',
     lastError: null,
     uptime: Date.now(),
     isAutoReconnectEnabled: true,
     heartbeatInterval: config.heartbeatInterval,
     lastHeartbeatTime: Date.now()
   }
   ```

#### 📊 狀態轉換圖
```
[初始化] → [連線中] → [已連線] → [心跳啟動] → [監控就緒]
    ↓          ↓         ↑            ↓
[配置載入]  [連線失敗]  [重連成功]   [定期PING/PONG]
```

### 2. **斷線處理流程**
> **用途：** 包含佇列處理、斷線嘗試重連、資料補發

#### 🔄 流程步驟

1. **斷線檢測**
   ```typescript
   // 心跳超時檢測
   const heartbeatTimeout = 8000
   const timeSinceLastPong = Date.now() - connectionStats.lastHeartbeatTime
   
   if (timeSinceLastPong > heartbeatTimeout) {
     connectionState = WebSocketConnectionState.RECONNECTING
     handleDisconnection()
   }
   ```

2. **佇列處理機制**
   ```typescript
   // 將新產生的 AudioChunk 加入待發送佇列
   const addToPendingQueue = (chunk: AudioChunk) => {
     chunk.status = AudioChunkStatus.PENDING
     pendingQueue.push(chunk)
     
     // 持久化到 localStorage（防止頁面重整遺失）
     localStorage.setItem('pendingChunks', JSON.stringify(pendingQueue))
   }
   ```

3. **斷線重連嘗試**
   ```typescript
   const attemptReconnection = async () => {
     if (connectionStats.reconnectCount >= config.maxReconnectAttempts) {
       connectionState = WebSocketConnectionState.ERROR
       return
     }
     
     connectionStats.reconnectCount++
     
     // 指數退避策略
     const delay = Math.min(1000 * Math.pow(2, connectionStats.reconnectCount), 30000)
     
     setTimeout(() => {
       websocket = new WebSocket(config.serverUrl)
       setupWebSocketHandlers()
     }, delay)
   }
   ```

4. **重連成功後資料補發**
   ```typescript
   websocket.onopen = () => {
     connectionState = WebSocketConnectionState.CONNECTED
     connectionStats.reconnectCount = 0  // 重置重連計數
     
     // 重發所有待發送的 AudioChunk
     resendPendingChunks()
   }
   
   const resendPendingChunks = () => {
     const pendingChunks = pendingQueue.filter(chunk => 
       chunk.status === AudioChunkStatus.PENDING || 
       chunk.status === AudioChunkStatus.ERROR
     )
     
     pendingChunks.forEach(chunk => {
       sendAudioChunk(chunk)
     })
   }
   ```

5. **資料完整性確認**
   ```typescript
   // 收到伺服器 ACK 確認
   websocket.onmessage = (event) => {
     const message: AudioStreamMessage = JSON.parse(event.data)
     
     if (message.type === 'ack') {
       const chunkId = message.data.chunkId
       updateChunkStatus(chunkId, AudioChunkStatus.RECEIVED)
       
       // 從佇列中移除已確認的 chunk
       removePendingChunk(chunkId)
     }
   }
   ```

#### 📊 斷線處理流程圖
```
[正常連線] → [心跳超時] → [斷線檢測] → [加入佇列]
     ↑                                        ↓
[資料補發] ← [重連成功] ← [嘗試重連] ← [觸發重連機制]
     ↓
[確認完整性] → [移除已發送項目] → [恢復正常流程]
```

#### 🔍 關鍵策略

**佇列管理策略：**
- **PENDING 狀態**: 新產生但尚未發送的 chunk
- **持久化存儲**: 使用 localStorage 防止頁面重整遺失
- **去重機制**: 避免重複發送相同的 chunk

**重連策略：**
- **指數退避**: 重連間隔逐漸增加，避免頻繁嘗試
- **最大次數限制**: 防止無限重連消耗資源
- **狀態追蹤**: 詳細記錄重連過程和失敗原因

**資料完整性保證：**
- **序號連續性**: 確保 AudioChunk.sequenceNumber 連續
- **ACK 確認機制**: 伺服器必須確認收到每個 chunk
- **錯誤重試**: 失敗的 chunk 會重新加入佇列

---

## 📈 資料流向總覽

```
[AudioStreamConfig] → [連線建立] → [心跳機制] → [狀態監控]
        ↓                                           ↓
[MediaRecorder] → [AudioChunk] → [AudioStreamMessage] → [WebSocket傳送]
        ↓              ↓               ↓                    ↓
    [錄音中斷]     [PENDING狀態]   [加入佇列]          [傳送失敗]
        ↓              ↓               ↓                    ↓
    [暫停錄音]     [佇列暫存]      [重連機制]          [斷線檢測]
        ↓              ↓               ↓                    ↓
    [恢復錄音]     [重連成功]      [資料補發]          [重新建連]
        ↓              ↓               ↓                    ↓
   [繼續產生chunk] [批次重發]      [ACK確認]           [恢復正常]
```

這個文檔按照您同事的範例格式，清晰地定義了三個核心資料格式和兩個主要流程，每個部分都有詳細的說明、程式碼範例和實際應用場景。