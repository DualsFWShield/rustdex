//! Native P2P & AetherShare Mesh Engine for Beerdex (replacing `js/vendor/p2p.js` & `peerjs.min.js`).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const CHUNK_SIZE: usize = 16 * 1024; // 16 KB matching `js/vendor/p2p.js`

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum P2PFrame {
    #[serde(rename = "meta")]
    Meta {
        filename: String,
        size: usize,
        #[serde(rename = "fileType")]
        file_type: String,
        #[serde(rename = "totalChunks")]
        total_chunks: usize,
    },
    #[serde(rename = "chunk")]
    Chunk { index: usize, data: Vec<u8> },
    #[serde(rename = "message")]
    Message { payload: serde_json::Value },
    #[serde(rename = "chunked_message")]
    ChunkedMessage {
        #[serde(rename = "transferId")]
        transfer_id: String,
        #[serde(rename = "chunkIndex")]
        chunk_index: usize,
        #[serde(rename = "totalChunks")]
        total_chunks: usize,
        data: String,
    },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum P2PConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Streaming,
    Error(String),
}

/// Incoming transfer assembler tracking chunk reception and buffer reconstruction.
#[derive(Debug, Clone)]
pub struct IncomingTransfer {
    pub filename: String,
    pub total_size: usize,
    pub file_type: String,
    pub total_chunks: usize,
    pub chunks: HashMap<usize, Vec<u8>>,
    pub received_bytes: usize,
}

impl IncomingTransfer {
    pub fn new(
        filename: String,
        total_size: usize,
        file_type: String,
        total_chunks: usize,
    ) -> Self {
        Self {
            filename,
            total_size,
            file_type,
            total_chunks,
            chunks: HashMap::with_capacity(total_chunks),
            received_bytes: 0,
        }
    }

    pub fn insert_chunk(&mut self, index: usize, data: Vec<u8>) -> bool {
        // Only count bytes for newly inserted chunks, not duplicates.
        let len = data.len();
        let is_new = self.chunks.insert(index, data).is_none();
        if is_new {
            self.received_bytes += len;
        }
        self.is_complete()
    }

    pub fn is_complete(&self) -> bool {
        self.chunks.len() >= self.total_chunks
    }

    pub fn progress_pct(&self) -> f64 {
        if self.total_size == 0 {
            100.0
        } else {
            ((self.received_bytes as f64 / self.total_size as f64) * 100.0).clamp(0.0, 100.0)
        }
    }

    pub fn assemble(&self) -> Option<Vec<u8>> {
        if !self.is_complete() {
            return None;
        }
        let mut buffer = Vec::with_capacity(self.total_size);
        for i in 0..self.total_chunks {
            let chunk = self.chunks.get(&i)?;
            buffer.extend_from_slice(chunk);
        }
        Some(buffer)
    }
}

pub struct P2PChunker;

impl P2PChunker {
    /// Splits a binary buffer into sequential 16KB chunks.
    pub fn split_bytes(data: &[u8]) -> Vec<Vec<u8>> {
        data.chunks(CHUNK_SIZE).map(|c| c.to_vec()).collect()
    }

    /// Creates standard metadata frame.
    pub fn create_meta_frame(
        filename: &str,
        data: &[u8],
        file_type: &str,
    ) -> (P2PFrame, Vec<P2PFrame>) {
        let chunks = Self::split_bytes(data);
        let total_chunks = chunks.len();
        let meta = P2PFrame::Meta {
            filename: filename.to_string(),
            size: data.len(),
            file_type: file_type.to_string(),
            total_chunks,
        };

        let chunk_frames: Vec<P2PFrame> = chunks
            .into_iter()
            .enumerate()
            .map(|(index, chunk_data)| P2PFrame::Chunk {
                index,
                data: chunk_data,
            })
            .collect();

        (meta, chunk_frames)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunking_and_assembly() {
        let test_data = vec![42u8; 40 * 1024]; // 40KB (3 chunks of 16KB, 16KB, 8KB)
        let (meta, chunks) =
            P2PChunker::create_meta_frame("backup.json", &test_data, "application/json");

        if let P2PFrame::Meta {
            filename,
            size,
            file_type,
            total_chunks,
        } = meta
        {
            assert_eq!(total_chunks, 3);
            let mut transfer = IncomingTransfer::new(filename, size, file_type, total_chunks);

            for chunk_frame in chunks {
                if let P2PFrame::Chunk { index, data } = chunk_frame {
                    transfer.insert_chunk(index, data);
                }
            }

            assert!(transfer.is_complete());
            let assembled = transfer.assemble().expect("Assembly failed");
            assert_eq!(assembled, test_data);
        } else {
            panic!("Expected Meta frame");
        }
    }
}
