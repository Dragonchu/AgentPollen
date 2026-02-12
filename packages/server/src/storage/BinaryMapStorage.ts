import { MapStorageProvider, TileMap, Tile, TileType } from "@battle-royale/shared";

/**
 * Binary format map storage provider.
 * 
 * Format:
 * - Header (8 bytes):
 *   - [0-3]: width (uint32, little endian)
 *   - [4-7]: height (uint32, little endian)
 * - Tiles (1 byte per tile):
 *   - Bits 0-1: TileType (0=Passable, 1=Blocked)
 *   - Bits 2-7: Reserved for weight/flags (future extension)
 * 
 * This format provides efficient storage (1 byte per tile + 8 byte header)
 * and is extensible for future features like variable tile weights.
 */
export class BinaryMapStorage implements MapStorageProvider {
  readonly name = "binary";

  /**
   * Serialize a tile map to binary format.
   */
  serialize(map: TileMap): Uint8Array {
    const headerSize = 8;
    const tileCount = map.width * map.height;
    const buffer = new Uint8Array(headerSize + tileCount);

    // Write header
    this.writeUInt32(buffer, 0, map.width);
    this.writeUInt32(buffer, 4, map.height);

    // Write tiles
    let offset = headerSize;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        buffer[offset++] = this.encodeTile(tile);
      }
    }

    return buffer;
  }

  /**
   * Deserialize a tile map from binary format.
   */
  deserialize(data: Uint8Array): TileMap {
    if (data.length < 8) {
      throw new Error("Invalid binary map data: too short");
    }

    // Read header
    const width = this.readUInt32(data, 0);
    const height = this.readUInt32(data, 4);

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid map dimensions: ${width}x${height}`);
    }

    const expectedSize = 8 + width * height;
    if (data.length !== expectedSize) {
      throw new Error(`Invalid binary map data: expected ${expectedSize} bytes, got ${data.length}`);
    }

    // Read tiles
    const tiles: Tile[][] = [];
    let offset = 8;

    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        row.push(this.decodeTile(data[offset++]));
      }
      tiles.push(row);
    }

    return { width, height, tiles };
  }

  /**
   * Encode a tile to a single byte.
   */
  private encodeTile(tile: Tile): number {
    let byte = tile.type & 0x03; // Bits 0-1: type
    // Bits 2-7 reserved for future use (weight, flags, etc.)
    if (tile.weight !== undefined) {
      // Store weight as 6 bits (0-63), clamped
      const weight = Math.min(63, Math.max(0, Math.floor(tile.weight)));
      byte |= (weight << 2);
    }
    return byte;
  }

  /**
   * Decode a tile from a single byte.
   */
  private decodeTile(byte: number): Tile {
    const type = (byte & 0x03) as TileType;
    const weightBits = (byte >> 2) & 0x3F;
    const tile: Tile = { type };
    
    // Only set weight if it's non-zero (optimization)
    if (weightBits > 0) {
      tile.weight = weightBits;
    }
    
    return tile;
  }

  /**
   * Write a 32-bit unsigned integer to buffer (little endian).
   */
  private writeUInt32(buffer: Uint8Array, offset: number, value: number): void {
    buffer[offset] = value & 0xFF;
    buffer[offset + 1] = (value >> 8) & 0xFF;
    buffer[offset + 2] = (value >> 16) & 0xFF;
    buffer[offset + 3] = (value >> 24) & 0xFF;
  }

  /**
   * Read a 32-bit unsigned integer from buffer (little endian).
   */
  private readUInt32(buffer: Uint8Array, offset: number): number {
    return (buffer[offset] | 
           (buffer[offset + 1] << 8) | 
           (buffer[offset + 2] << 16) | 
           (buffer[offset + 3] << 24)) >>> 0;
  }
}
