/**
 * Type-safe JSON serializer/deserializer for cache values.
 * Handles edge cases like undefined, Date objects, Maps, Sets,
 * and circular references gracefully.
 */

export interface SerializerOptions {
  /** Whether to handle Date objects specially. Default: true. */
  handleDates: boolean;
  /** Whether to handle Map/Set objects. Default: false. */
  handleCollections: boolean;
  /** Custom replacer function for JSON.stringify. */
  replacer?: (key: string, value: unknown) => unknown;
  /** Custom reviver function for JSON.parse. */
  reviver?: (key: string, value: unknown) => unknown;
}

const DEFAULT_OPTIONS: SerializerOptions = {
  handleDates: true,
  handleCollections: false,
};

/** Internal type markers for special values. */
const TYPE_MARKERS = {
  DATE: '__cache_storm_date__',
  MAP: '__cache_storm_map__',
  SET: '__cache_storm_set__',
  UNDEFINED: '__cache_storm_undefined__',
} as const;

/**
 * Serialize a value to a JSON string with type safety.
 * Supports Date, Map, Set, and undefined values when configured.
 */
export function serialize<T>(value: T, options: Partial<SerializerOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const replacer = (key: string, val: unknown): unknown => {
    if (opts.replacer) {
      val = opts.replacer(key, val);
    }

    if (val === undefined) {
      return { [TYPE_MARKERS.UNDEFINED]: true };
    }

    if (opts.handleDates && val instanceof Date) {
      return { [TYPE_MARKERS.DATE]: val.toISOString() };
    }

    if (opts.handleCollections) {
      if (val instanceof Map) {
        return { [TYPE_MARKERS.MAP]: Array.from(val.entries()) };
      }
      if (val instanceof Set) {
        return { [TYPE_MARKERS.SET]: Array.from(val.values()) };
      }
    }

    return val;
  };

  try {
    return JSON.stringify(value, replacer);
  } catch (error) {
    if (error instanceof TypeError && String(error).includes('circular')) {
      throw new SerializationError('Cannot serialize circular structures');
    }
    throw new SerializationError(`Serialization failed: ${String(error)}`);
  }
}

/**
 * Deserialize a JSON string back to its original typed value.
 * Restores Date, Map, Set, and undefined values when detected.
 */
export function deserialize<T>(data: string, options: Partial<SerializerOptions> = {}): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const reviver = (_key: string, val: unknown): unknown => {
    if (val !== null && typeof val === 'object') {
      const obj = val as Record<string, unknown>;

      if (obj[TYPE_MARKERS.UNDEFINED] === true) {
        return undefined;
      }

      if (opts.handleDates && typeof obj[TYPE_MARKERS.DATE] === 'string') {
        return new Date(obj[TYPE_MARKERS.DATE] as string);
      }

      if (opts.handleCollections) {
        if (Array.isArray(obj[TYPE_MARKERS.MAP])) {
          return new Map(obj[TYPE_MARKERS.MAP] as Array<[unknown, unknown]>);
        }
        if (Array.isArray(obj[TYPE_MARKERS.SET])) {
          return new Set(obj[TYPE_MARKERS.SET] as unknown[]);
        }
      }
    }

    if (opts.reviver) {
      return opts.reviver(_key, val);
    }

    return val;
  };

  try {
    return JSON.parse(data, reviver) as T;
  } catch (error) {
    throw new SerializationError(`Deserialization failed: ${String(error)}`);
  }
}

/**
 * Check if a value can be serialized without errors.
 */
export function isSerializable(value: unknown): boolean {
  try {
    serialize(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deep clone a value through serialize/deserialize round-trip.
 * This ensures complete isolation of cached values.
 */
export function deepClone<T>(value: T, options: Partial<SerializerOptions> = {}): T {
  const serialized = serialize(value, options);
  return deserialize<T>(serialized, options);
}

/**
 * Custom error class for serialization failures.
 */
export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
    Object.setPrototypeOf(this, SerializationError.prototype);
  }
}
