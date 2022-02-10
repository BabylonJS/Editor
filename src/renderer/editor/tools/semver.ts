export class Semver {
    /**
     * Defines the version including major.minor.patch.
     */
    public readonly version: string;
    /**
     * Defines the pre-release tag (eg. -alpha.0, -beta.0 etc.).
     */
    public readonly preRelease: string;

    /**
     * Defines the current major version.
     */
    public readonly major: string;
    /**
     * Defines the current minor version.
     */
    public readonly minor: string;
    /**
     * Defines the current patch version.
     */
    public readonly patch: string;

    /**
     * Constructor.
     */
    public constructor(version: string) {
        const mainSplit = version.split("-");

        this.version = mainSplit[0];
        this.preRelease = mainSplit[1] ?? "";

        const versionSplit = this.version.split(".");
        this.major = versionSplit[0];
        this.minor = versionSplit[1];
        this.patch = versionSplit[2];
    }

    /**
     * Returns wether or not the current major version is the same as the given one.
     * @param otherVersion defines the other version to compare.
     */
    public isSameMajorVersion(otherVersion: Semver): boolean {
        return this.major === otherVersion.major;
    }

    /**
     * Returns wether or not the current version is greater than the given one.
     * @param otherVersion defines the version including major.minor.patch.
     */
    public isVersionGreaterThan(otherVersion: Semver): boolean {
        return this.version > otherVersion.version;
    }

    /**
     * Returns wether or not the current prerelease tag is greater than the given one.
     * @param otherPreRelease defines the prerelease tag to compare.
     */
    public isPreReleaseGreatedThan(otherPreRelease: Semver): boolean {
        return this.preRelease > otherPreRelease.preRelease;
    }
}
