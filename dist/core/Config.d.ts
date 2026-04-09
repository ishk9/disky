/**
 * Reads and manages ~/.disky/config.json for persistent user configuration.
 */
export declare class Config {
    private static readonly CONFIG_DIR;
    private static readonly CONFIG_FILE;
    /**
     * Returns normalised absolute exclusion paths from the config file.
     * Returns an empty array if the config file is missing or malformed.
     */
    getExclusions(): string[];
    private load;
    private normalisePath;
}
//# sourceMappingURL=Config.d.ts.map