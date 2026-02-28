const Runtime = require('../engine/runtime');
const EventEmitter = require('events');

class TemporaryStorageProvider {
    static symbol = Symbol('Symbol.TemporaryStorageProvider');

    constructor (object) {
        object[TemporaryStorageProvider.symbol] = object[TemporaryStorageProvider.symbol] || Object.create(null);

        this._object = object;
    }

    getStore (id) {
        return (
            this._object[TemporaryStorageProvider.symbol][id] =
                this._object[TemporaryStorageProvider.symbol][id] ?? Object.create(null)
        );
    }
    deleteStore (id) {
        delete this._object[TemporaryStorageProvider.symbol][id];
    }

    clearStorage () {
        this._object[TemporaryStorageProvider.symbol] = Object.create(null);
    }

    unsafe$getStorage () {
        return this._object[TemporaryStorageProvider.symbol];
    }
    unsafe$setStorage (store) {
        this._object[TemporaryStorageProvider.symbol] = store;
    }

    unsafe$setStore (id, value) {
        this._object[TemporaryStorageProvider.symbol][id] = value;
    }
}

class StorageProvider extends EventEmitter {
    static symbol = Symbol('Symbol.StorageProvider');

    static EV_PROJECT_STORAGE_CLEAR = 'PROJECT_STORAGE_CLEAR';
    static EV_TEMPORARY_STORAGE_CLEAR = 'TEMPORARY_STORAGE_CLEAR';
    static EV_EXTENSION_STORAGE_CLEAR = 'EXTENSION_STORAGE_CLEAR';
    static EV_PROJECT_STORAGE_SET = 'PROJECT_STORAGE_SET';
    static EV_TEMPORARY_STORAGE_SET = 'TEMPORARY_STORAGE_SET';
    static EV_EXTENSION_STORAGE_SET = 'EXTENSION_STORAGE_SET';

    constructor (runtime, object) {
        super();

        object[StorageProvider.symbol] = object[StorageProvider.symbol] || {};
        object = object[StorageProvider.symbol];

        this._store = object;

        object.temporaryStorage = Object.create(null);
        object.projectStorage = Object.create(null);
        object.extensionStorage = Object.create(null);

        this.clearTemporaryStorage = this.clearTemporaryStorage.bind(this);
        this.clearProjectStorage = this.clearProjectStorage.bind(this);
        this.clearExtensionStorage = this.clearExtensionStorage.bind(this);

        runtime.on(Runtime.PROJECT_LOADED, () => {
            this.clearTemporaryStorage();
        });
        runtime.on(Runtime.PROJECT_START, () => {
            this.clearTemporaryStorage();
        });
        runtime.on(Runtime.PROJECT_STOP_ALL, () => {
            this.clearTemporaryStorage();
        });
    }

    getProjectStore (id) {
        return (this._store.projectStorage[id] = this._store.projectStorage[id] ?? Object.create(null));
    }
    getTemporaryStore (id) {
        return (this._store.temporaryStorage[id] = this._store.temporaryStorage[id] ?? Object.create(null));
    }
    deleteProjectStore (id) {
        delete this._store.projectStorage[id];
    }
    deleteTemporaryStore (id) {
        delete this._store.temporaryStorage[id];
    }

    clearProjectStorage () {
        this.emit(StorageProvider.EV_PROJECT_STORAGE_CLEAR, this._store.projectStorage);
        this._store.projectStorage = Object.create(null);
    }
    clearTemporaryStorage () {
        this.emit(StorageProvider.EV_TEMPORARY_STORAGE_CLEAR, this._store.temporaryStorage);
        this._store.temporaryStorage = Object.create(null);
    }
    clearExtensionStorage () {
        this.emit(StorageProvider.EV_EXTENSION_STORAGE_CLEAR, this._store.extensionStorage);
        this._store.extensionStorage = Object.create(null);
    }

    unsafe$getProjectStorage () {
        return this._store.projectStorage;
    }
    unsafe$getTemporaryStorage () {
        return this._store.temporaryStorage;
    }
    unsafe$getExtensionStorage () {
        return this._store.extensionStorage;
    }
    unsafe$setProjectStorage (store) {
        this.emit(StorageProvider.EV_PROJECT_STORAGE_SET, this._store.projectStorage, store);
        this._store.projectStorage = store;
    }
    unsafe$setTemporaryStorage (store) {
        this.emit(StorageProvider.EV_TEMPORARY_STORAGE_SET, this._store.temporaryStorage, store);
        this._store.temporaryStorage = store;
    }
    unsafe$setExtensionStorage (store) {
        this.emit(StorageProvider.EV_EXTENSION_STORAGE_SET, this._store.extensionStorage, store);
        this._store.extensionStorage = store;
    }
}

module.exports = {
    UnmanagedTemporaryStorageProvider: TemporaryStorageProvider,
    StorageProvider
};
