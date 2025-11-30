// IndexedDB를 사용한 대용량 파일 저장 유틸리티

interface FileData {
  id: string;
  name: string;
  size: number;
  sequenceType: string;
  arrayBuffer: ArrayBuffer;
  uploadDate: number;
}

class FileStorage {
  private dbName = 'MRIFileStorage';
  private version = 1;
  private storeName = 'files';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('sequenceType', 'sequenceType', { unique: false });
        }
      };
    });
  }

  async saveFile(sequenceType: string, file: File): Promise<string> {
    const db = await this.openDB();
    const arrayBuffer = await file.arrayBuffer();
    
    const fileData: FileData = {
      id: `${sequenceType}-${Date.now()}`,
      name: file.name,
      size: file.size,
      sequenceType,
      arrayBuffer,
      uploadDate: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // 기존 같은 시퀀스 타입 파일 삭제
      const index = store.index('sequenceType');
      const deleteRequest = index.openCursor(IDBKeyRange.only(sequenceType));
      
      deleteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // 새 파일 저장
          const addRequest = store.add(fileData);
          addRequest.onsuccess = () => resolve(fileData.id);
          addRequest.onerror = () => reject(addRequest.error);
        }
      };
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  async getFile(sequenceType: string): Promise<FileData | null> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sequenceType');
      const request = index.get(sequenceType);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFiles(): Promise<Record<string, FileData>> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const files = request.result;
        const result: Record<string, FileData> = {};
        
        files.forEach(file => {
          result[file.sequenceType] = file;
        });
        
        resolve(result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(sequenceType: string): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sequenceType');
      const request = index.openCursor(IDBKeyRange.only(sequenceType));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const fileStorage = new FileStorage();
export type { FileData };
