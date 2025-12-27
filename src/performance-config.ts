/**
 * Performance configuration for package loading optimizations
 */

/**
 * Configuration interface for performance optimizations
 */
export interface PerformanceConfig {
    /** Maximum number of PropertyTag objects to keep in pool (default: 10000) */
    propertyTagPoolSize?: number;
    /** Maximum number of BufferValue objects to keep in pool per type (default: 100) */
    bufferValuePoolSize?: number;
}

/**
 * Configure performance settings for package loading.
 * Call this before loading any packages to optimize memory usage vs speed.
 *
 * @param config Performance configuration options
 *
 * @example
 * ```typescript
 * import { configurePerformance } from 'l2js-core/performance-config';
 *
 * // Use large pools for better performance (more memory)
 * configurePerformance({
 *   propertyTagPoolSize: 50000,
 *   bufferValuePoolSize: 500
 * });
 *
 * // Use small pools for lower memory usage
 * configurePerformance({
 *   propertyTagPoolSize: 1000,
 *   bufferValuePoolSize: 10
 * });
 * ```
 */
export function configurePerformance(config: PerformanceConfig): void {
    if (config.propertyTagPoolSize !== undefined) {
        // Import here to avoid circular dependencies
        const PropertyTag = require("./unreal/un-property/un-property-tag").PropertyTag;
        PropertyTag.setMaxPoolSize(config.propertyTagPoolSize);
    }

    if (config.bufferValuePoolSize !== undefined) {
        const UStruct = require("./unreal/un-struct").UStruct;
        UStruct.setMaxBufferPoolSize(config.bufferValuePoolSize);
    }
}
