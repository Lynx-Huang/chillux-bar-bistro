# POC 資料格式與流程說明

## 📋 目錄

1. [資料格式定義](#資料格式定義)
2. [流程說明](#流程說明)
3. [關鍵策略](#關鍵策略)

---

## 🎯 資料格式定義

### 1. **WebSocketConnectionState**
```typescript
enum WebSocketConnectionState {
  DISCONNECTED = 'disconnected',  // WebSocket 未連線
  CONNECTING = 'connecting',       // 正在建立連線
  CONNECTED = 'connected',         // 已成功連線
  RECONNECTING = 'reconnecting'    // 重新連線中
}
```

### 2. **AudioChunkStatus**
```typescript
enum AudioChunkStatus {
  PENDING = 'PENDING',       // 音訊塊待發送
  SENT = 'SENT',            // 已發送至伺服器
  RECEIVED = 'RECEIVED',    // 伺服器確認接收
  PROCESSED = 'PROCESSED',  // 伺服器處理完成
  ERROR = 'ERROR'           // 處理過程發生錯誤
}
```

### 3. **RecordingState**
```typescript
enum RecordingState {
  IDLE = 'idle',           // 錄音器閒置狀態
  RECORDING = 'recording', // 正在錄音中
  PAUSED = 'paused',       // 錄音已暫停
  STOPPING = 'stopping'    // 正在停止錄音
}
```

### 4. **AudioChunk**
```typescript
interface AudioChunk {
  id: string                    // 音訊塊唯一識別碼，用於追蹤
  sequenceNumber: number        // 順序編號，確保音訊按序合併
  data: string                 // Base64 編碼音訊數據
  status: AudioChunkStatus     // 當前處理狀態
  timestamp: number            // 創建時間戳記
  duration: number             // 音訊實際時長（秒）
  taskId: string              // 任務識別碼，關聯錄音會話
  format: string              // 音訊格式（webm/wav）
  metadata?: {                // 額外資訊
    isPartial?: boolean       // 是否為部分音訊塊（暫停時產生）
    sampleRate?: number       // 採樣率
    channels?: number         // 聲道數
  }
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
  "metadata": {
    "isPartial": false,
    "sampleRate": 48000,
    "channels": 1
  }
}
```

### 5. **WebSocketMessage**
```typescript
interface WebSocketMessage {
  type: string                 // 訊息類型識別
  timestamp: string           // 伺服器時間戳記
  clientId: string            // 客戶端識別碼
  data?: any                  // 訊息內容資料
}
```

**範例資料：**
```json
{
  "type": "frontend-audio-chunk",
  "timestamp": "2024-11-19T10:30:00.000Z",
  "clientId": "client_1732012340000_abc123",
  "data": {
    "chunk": { /* AudioChunk 物件 */ },
    "taskId": "task_1732012340000_xyz789"
  }
}
```

### 6. **ConnectionStats**
```typescript
interface ConnectionStats {
  reconnectCount: number              // 重連次數統計
  connectionState: WebSocketConnectionState // 當前連線狀態
  lastError: string | null           // 最後發生的錯誤
  uptime: number                     // 連線持續時間（毫秒）
  isAutoReconnectEnabled: boolean    // 是否啟用自動重連
  heartbeatInterval: number          // 心跳間隔時間
  lastHeartbeatTime: number          // 最後心跳時間
}
```

**範例資料：**
```json
{
  "reconnectCount": 3,
  "connectionState": "connected",
  "lastError": null,
  "uptime": 125000,
  "isAutoReconnectEnabled": true,
  "heartbeatInterval": 5000,
  "lastHeartbeatTime": 1732012345678
}
```

### 7. **EventRecord**
```typescript
interface EventRecord {
  id: string                    // 事件唯一識別碼
  timestamp: string            // 事件發生時間
  action: string              // 事件動作類型
  status: AudioChunkStatus    // 事件狀態
  details: string             // 事件詳細描述
  metadata?: Record<string, any> // 額外資訊
  chunkId?: string           // 關聯的音訊塊 ID
}
```

**範例資料：**
```json
{
  "id": "event_1732012345678_def456",
  "timestamp": "2024-11-19T10:30:00.000Z",
  "action": "chunk_sent",
  "status": "SENT",
  "details": "Audio chunk sent successfully",
  "metadata": {
    "chunkSize": 64796,
    "duration": 3.0
  },
  "chunkId": "chunk_1732012345678_abc123"
}
```

---

## 🔄 流程說明

### 1. **WebSocket 連線流程**

#### 初始連線
1. **狀態檢查**: 檢查 `ConnectionStats.connectionState`
2. **狀態變更**: `connectionState` 從 `DISCONNECTED` → `CONNECTING`
3. **連線建立**: WebSocket 握手成功後 `connectionState` → `CONNECTED`
4. **心跳啟動**: 根據 `ConnectionStats.heartbeatInterval` 開始定期心跳

#### 斷線重連
1. **斷線檢測**: 心跳失敗或連線中斷，`connectionState` → `RECONNECTING`
2. **重連計數**: `ConnectionStats.reconnectCount` 累加
3. **重連策略**: 檢查 `ConnectionStats.isAutoReconnectEnabled` 決定是否自動重連
4. **重連成功**: `connectionState` → `CONNECTED`，`reconnectCount` 重置為 0

### 2. **音訊錄製流程**

#### 開始錄音
1. **狀態檢查**: 確認 `RecordingState` 為 `IDLE`
2. **狀態變更**: `RecordingState` → `RECORDING`
3. **音訊捕獲**: 開始 MediaRecorder，每 3 秒觸發 chunk 產生
4. **Chunk 創建**: 產生新的 `AudioChunk`，初始 `status` 為 `PENDING`

#### Chunk 處理
1. **發送準備**: `AudioChunk.status` 從 `PENDING` → `SENT`
2. **WebSocket 發送**: 透過 `WebSocketMessage` 包裝發送
3. **伺服器確認**: 收到 ACK 後 `status` → `RECEIVED`
4. **處理完成**: 伺服器處理完成後 `status` → `PROCESSED`

#### 暫停錄音
1. **狀態變更**: `RecordingState` → `PAUSED`
2. **強制輸出**: 立即創建當前 chunk，`metadata.isPartial` 設為 `true`
3. **序號保持**: `AudioChunk.sequenceNumber` 不重置，保持連續性

#### 繼續錄音
1. **狀態檢查**: 確認 `RecordingState` 為 `PAUSED`
2. **狀態變更**: `RecordingState` → `RECORDING`
3. **序號延續**: 新 chunk 的 `sequenceNumber` 從上次繼續累加

### 3. **斷線處理流程**

#### Pending Queue 機制
1. **斷線檢測**: `ConnectionStats.connectionState` → `RECONNECTING`
2. **Queue 暫存**: 新產生的 chunk 保持 `status` 為 `PENDING`
3. **重連成功**: `connectionState` → `CONNECTED`
4. **Queue 重發**: 所有 `status` 為 `PENDING` 的 chunk 重新發送

---

## 🎯 關鍵策略

### 1. **連線狀態判斷策略**

**判斷依據**: `ConnectionStats.connectionState`
- **允許錄音**: `connectionState === 'CONNECTED'`
- **顯示重連**: `connectionState === 'RECONNECTING'`
- **禁用功能**: `connectionState === 'DISCONNECTED'`

**關鍵邏輯**:
```typescript
// 按鈕啟用判斷
const canStartRecording = computed(() => 
  connectionStats.connectionState === 'CONNECTED' && 
  recordingState.value === 'IDLE'
)

// 自動重連觸發
if (connectionStats.connectionState === 'DISCONNECTED' && 
    connectionStats.isAutoReconnectEnabled) {
  // 觸發重連邏輯
}
```

### 2. **音訊 Chunk 狀態管理策略**

**狀態轉換判斷**: `AudioChunk.status`
- **可重發判斷**: `status === 'PENDING' || status === 'ERROR'`
- **完成判斷**: `status === 'PROCESSED'`
- **統計計算**: 根據各狀態的 chunk 數量

**關鍵邏輯**:
```typescript
// Pending Queue 重發
const pendingChunks = chunkHistory.filter(chunk => 
  chunk.status === 'PENDING' || chunk.status === 'ERROR'
)

// 完成率計算
const completionRate = processedChunks.length / totalChunks.length
```

### 3. **序號連續性保證策略**

**判斷依據**: `RecordingState` 和 `AudioChunk.sequenceNumber`
- **新會話**: `RecordingState === 'IDLE'` 時重置序號為 0
- **暫停恢復**: `RecordingState === 'PAUSED'` 時保持序號
- **序號分配**: 每個新 chunk 的 `sequenceNumber = ++chunkCounter`

**關鍵邏輯**:
```typescript
// 序號管理
if (recordingState === RecordingState.IDLE) {
  chunkCounter = 0  // 新會話重置
} else {
  // 暫停恢復時保持 chunkCounter 不變
}

// 新 chunk 序號
const newChunk: AudioChunk = {
  sequenceNumber: ++chunkCounter,  // 連續遞增
  // ... 其他屬性
}
```

### 4. **心跳機制策略**

**判斷依據**: `ConnectionStats.heartbeatInterval` 和 `lastHeartbeatTime`
- **發送週期**: 每 `heartbeatInterval` 毫秒發送一次 PING
- **超時判斷**: 8 秒內未收到 PONG 視為斷線
- **斷線觸發**: 自動啟用重連機制

**關鍵邏輯**:
```typescript
// 心跳超時檢測
const heartbeatTimeout = 8000
const timeSinceLastPong = Date.now() - lastHeartbeatTime

if (timeSinceLastPong > heartbeatTimeout) {
  connectionState = 'RECONNECTING'
  // 觸發重連
}
```

---

## 📊 資料流向總覽

```
[MediaRecorder] → [AudioChunk{PENDING}] → [WebSocket發送] → [AudioChunk{SENT}]
     ↓                                                              ↓
[錄音中斷時]                                                    [收到ACK]
     ↓                                                              ↓
[PendingQueue]                                              [AudioChunk{RECEIVED}]
     ↓                                                              ↓
[重連成功重發]                                              [伺服器處理完成]
     ↓                                                              ↓
[恢復正常流程]                                          [AudioChunk{PROCESSED}]
```

這個文檔提供了完整的資料格式定義和流程說明，基於資料格式驅動的設計理念，明確說明了各個關鍵判斷點和狀態變化邏輯。