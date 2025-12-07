import { MODULE_NAME } from "./settings.js";

const AUDIO_EXTENSIONS = new Set(
    Object.keys(CONST.AUDIO_FILE_EXTENSIONS).map((e) => `.${e.toLowerCase()}`),
);

export const WEATHER_PLAYLIST_NAME = "Mini Calendar Weather";

export function formatTrackName(filePath) {
    let decodedPath = "";
    try {
        decodedPath = decodeURIComponent(filePath);
    } catch (e) {
        console.warn(`Mini Player: Could not decode path: ${filePath}`, e);
        decodedPath = filePath;
    }
    let name = decodedPath.split("/").pop() || "Unknown Track"; 
    name = name.substring(0, name.lastIndexOf("."));
    name = name.replace(/[_-]/g, " ");
    name = name.replace(/\b\w/g, (l) => l.toUpperCase());
    return name;
}

function isValidAudioFile(filePath) {
    const ext = `.${filePath.split(".").pop()}`.toLowerCase();
    return AUDIO_EXTENSIONS.has(ext);
}

export class PlaylistImporter {
    constructor() {
        this.source = "data";
        this.bucket = null;
        this.rootPath = `modules/${MODULE_NAME}/sfx/`;
    }

    async importFromDirectory() {
        try {
            try {
                await foundry.applications.apps.FilePicker.implementation.browse(
                    this.source,
                    this.rootPath,
                    { bucket: this.bucket }
                );
            } catch (e) {
                return;
            }

            await this._processSubdirectory(this.rootPath);
            
        } catch (err) {
            console.error("Mini Calendar | SFX Import Error:", err);
        }
    }

    async _processSubdirectory(dirPath) {
        let playlist = null;

        try {
            const browseResult = await foundry.applications.apps.FilePicker.implementation.browse(
                this.source,
                dirPath,
                { bucket: this.bucket },
            );

            const validAudioFiles = browseResult.files.filter(isValidAudioFile);
            
            if (validAudioFiles.length > 0) {
                playlist = await this._createOrUpdatePlaylist(
                    WEATHER_PLAYLIST_NAME,
                    dirPath,
                );
                if (playlist) {
                    await this._addOrUpdateSounds(playlist, validAudioFiles);
                }
            }

        } catch (err) {
            console.error(`Error processing directory ${dirPath}:`, err);
        }
    }

    async _createOrUpdatePlaylist(name, path) {
        const playlistData = {
            name: name,
            flags: {
                [MODULE_NAME]: {
                    imported: true,
                    importPath: path,
                    isWeatherPlaylist: true 
                },
            },
            mode: CONST.PLAYLIST_MODES.DISABLED, 
            fade: 2000,
            channel: "environment"
        };

        let playlist = game.playlists.find(
            (p) => p.getFlag(MODULE_NAME, "isWeatherPlaylist") === true || p.name === name
        );

        try {
            if (playlist) {
                await playlist.update(playlistData);
            } else {
                playlist = await Playlist.create(playlistData);
            }
            return playlist;
        } catch (err) {
            console.error(`Failed to create/update playlist ${name}:`, err);
            return null;
        }
    }

    async _addOrUpdateSounds(playlist, validAudioFiles) {
        const existingPaths = new Set(playlist.sounds.map((s) => s.path));
        const newSoundsData = [];
        
        for (const path of validAudioFiles) {
            if (existingPaths.has(path)) continue;

            newSoundsData.push({
                name: formatTrackName(path), 
                path: path,
                repeat: true,
                volume: 0.3,
                flags: {
                    [MODULE_NAME]: { imported: true },
                },
            });
        }

        if (newSoundsData.length > 0) {
            await playlist.createEmbeddedDocuments("PlaylistSound", newSoundsData);
            console.log(`Mini Calendar | Added ${newSoundsData.length} new SFX to playlist.`);
        }
    }
}