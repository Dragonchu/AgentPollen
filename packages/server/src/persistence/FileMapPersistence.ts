import { MapStorageProvider, TileMap } from "@battle-royale/shared";
import { BinaryMapStorage } from "../storage/BinaryMapStorage.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Simple file-based map persistence using the binary storage provider.
 * Demonstrates the plugin-based storage architecture.
 */
export class FileMapPersistence {
  private storage: MapStorageProvider;
  private mapsDir: string;

  constructor(storage?: MapStorageProvider, mapsDir: string = "./maps") {
    this.storage = storage ?? new BinaryMapStorage();
    this.mapsDir = mapsDir;
    
    // Ensure maps directory exists
    if (!fs.existsSync(this.mapsDir)) {
      fs.mkdirSync(this.mapsDir, { recursive: true });
    }
  }

  /**
   * Save a map to disk.
   */
  async save(map: TileMap, name: string): Promise<void> {
    const data = this.storage.serialize(map);
    const filePath = path.join(this.mapsDir, `${name}.map`);
    await fs.promises.writeFile(filePath, data);
    console.log(`Map "${name}" saved to ${filePath} (${data.length} bytes)`);
  }

  /**
   * Load a map from disk.
   */
  async load(name: string): Promise<TileMap> {
    const filePath = path.join(this.mapsDir, `${name}.map`);
    const data = await fs.promises.readFile(filePath);
    const map = this.storage.deserialize(new Uint8Array(data));
    console.log(`Map "${name}" loaded from ${filePath}`);
    return map;
  }

  /**
   * Check if a map exists.
   */
  exists(name: string): boolean {
    const filePath = path.join(this.mapsDir, `${name}.map`);
    return fs.existsSync(filePath);
  }

  /**
   * List all saved maps.
   */
  list(): string[] {
    return fs
      .readdirSync(this.mapsDir)
      .filter(f => f.endsWith(".map"))
      .map(f => f.replace(".map", ""));
  }

  /**
   * Delete a saved map.
   */
  async delete(name: string): Promise<void> {
    const filePath = path.join(this.mapsDir, `${name}.map`);
    await fs.promises.unlink(filePath);
    console.log(`Map "${name}" deleted`);
  }
}
