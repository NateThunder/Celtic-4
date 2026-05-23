"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPriceLabel, sanitizePriceInput } from "../../lib/prices";
import PixelIcon from "./PixelIcon";
import StemPlayer from "./StemPlayer";
import type { Track } from "./types";
import styles from "./stemPlayer.module.css";

const STEM_COLORS = [
  "#c97b12",
  "#7f9a63",
  "#8b3f31",
  "#4c7a86",
  "#9d7d31",
  "#735c8f",
  "#b85d2a",
  "#3f6f55",
];

type PendingStem = {
  id: string;
  name: string;
  price: string;
  file: File;
  fileName: string;
  color: string;
};

type EditableStem = {
  id: string;
  name: string;
  price: string;
};

type StemAdminAppProps = {
  initialTracks: Track[];
};

type CurrencyInputProps = {
  value: string;
  placeholder: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
};

function CurrencyInput({ value, placeholder, ariaLabel, onChange }: CurrencyInputProps) {
  return (
    <span className={styles.currencyInput}>
      <span className={styles.currencySymbol} aria-hidden="true">
        £
      </span>
      <input
        value={value}
        placeholder={placeholder}
        inputMode="decimal"
        pattern="[0-9.]*"
        aria-label={ariaLabel}
        onChange={(event) => onChange(sanitizePriceInput(event.target.value))}
      />
    </span>
  );
}

const normalizeNameFromFile = (fileName: string) =>
  fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `stem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const isLikelyAudioFile = (file: File) =>
  file.type.startsWith("audio/") ||
  /\.(aac|aiff?|flac|m4a|mp3|ogg|opus|wav|webm)$/i.test(file.name);

export default function StemAdminApp({ initialTracks }: StemAdminAppProps) {
  const [title, setTitle] = useState("Celtic Worship Stem Session");
  const [artistName, setArtistName] = useState("Celtic Worship");
  const [fullStemsPrice, setFullStemsPrice] = useState("");
  const [pendingStems, setPendingStems] = useState<PendingStem[]>([]);
  const [savedTracks, setSavedTracks] = useState(initialTracks);
  const [selectedTrackId, setSelectedTrackId] = useState(initialTracks[0]?.id ?? "");
  const [editTitle, setEditTitle] = useState("");
  const [editArtistName, setEditArtistName] = useState("");
  const [editFullStemsPrice, setEditFullStemsPrice] = useState("");
  const [editableStems, setEditableStems] = useState<EditableStem[]>([]);
  const [pendingMissingStems, setPendingMissingStems] = useState<PendingStem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const missingFileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSavedTrack = useMemo(
    () => savedTracks.find((track) => track.id === selectedTrackId) ?? savedTracks[0] ?? null,
    [savedTracks, selectedTrackId],
  );

  useEffect(() => {
    if (!selectedSavedTrack) {
      setEditTitle("");
      setEditArtistName("");
      setEditFullStemsPrice("");
      setEditableStems([]);
      setPendingMissingStems([]);
      return;
    }

    setEditTitle(selectedSavedTrack.title);
    setEditArtistName(selectedSavedTrack.artistName || "");
    setEditFullStemsPrice(sanitizePriceInput(selectedSavedTrack.fullStemsPrice || ""));
    setEditableStems(
      selectedSavedTrack.stems.map((stem) => ({
        id: stem.id,
        name: stem.name,
        price: sanitizePriceInput(stem.price || ""),
      })),
    );
    setPendingMissingStems([]);
  }, [selectedSavedTrack]);

  const addFiles = (fileList: FileList | File[]) => {
    const audioFiles = Array.from(fileList).filter(isLikelyAudioFile);
    if (!audioFiles.length) {
      setError("Choose at least one audio file.");
      return;
    }

    setStatus(null);
    setError(null);
    setPendingStems((previous) => [
      ...previous,
      ...audioFiles.map((file, index) => ({
        id: createId(),
        name: normalizeNameFromFile(file.name) || `Stem ${previous.length + index + 1}`,
        price: "",
        file,
        fileName: file.name,
        color: STEM_COLORS[(previous.length + index) % STEM_COLORS.length],
      })),
    ]);
  };

  const addMissingFiles = (fileList: FileList | File[]) => {
    const audioFiles = Array.from(fileList).filter(isLikelyAudioFile);
    if (!audioFiles.length) {
      setError("Choose at least one audio file.");
      return;
    }

    setStatus(null);
    setError(null);
    setPendingMissingStems((previous) => [
      ...previous,
      ...audioFiles.map((file, index) => ({
        id: createId(),
        name: normalizeNameFromFile(file.name) || `Stem ${editableStems.length + previous.length + index + 1}`,
        price: "",
        file,
        fileName: file.name,
        color: STEM_COLORS[(editableStems.length + previous.length + index) % STEM_COLORS.length],
      })),
    ]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const handleMissingFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addMissingFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const updateStemName = (stemId: string, name: string) => {
    setPendingStems((previous) =>
      previous.map((stem) => (stem.id === stemId ? { ...stem, name } : stem)),
    );
  };

  const updateStemPrice = (stemId: string, price: string) => {
    const nextPrice = sanitizePriceInput(price);
    setPendingStems((previous) =>
      previous.map((stem) => (stem.id === stemId ? { ...stem, price: nextPrice } : stem)),
    );
  };

  const updateEditableStemPrice = (stemId: string, price: string) => {
    const nextPrice = sanitizePriceInput(price);
    setEditableStems((previous) =>
      previous.map((stem) => (stem.id === stemId ? { ...stem, price: nextPrice } : stem)),
    );
  };

  const updateMissingStemName = (stemId: string, name: string) => {
    setPendingMissingStems((previous) =>
      previous.map((stem) => (stem.id === stemId ? { ...stem, name } : stem)),
    );
  };

  const updateMissingStemPrice = (stemId: string, price: string) => {
    const nextPrice = sanitizePriceInput(price);
    setPendingMissingStems((previous) =>
      previous.map((stem) => (stem.id === stemId ? { ...stem, price: nextPrice } : stem)),
    );
  };

  const removeStem = (stemId: string) => {
    setPendingStems((previous) => previous.filter((stem) => stem.id !== stemId));
  };

  const removeMissingStem = (stemId: string) => {
    setPendingMissingStems((previous) => previous.filter((stem) => stem.id !== stemId));
  };

  const clearPendingStems = () => {
    setPendingStems([]);
    setStatus(null);
    setError(null);
  };

  const saveStemTrack = async () => {
    if (!pendingStems.length) {
      setError("Add at least one stem before saving.");
      return;
    }

    setIsSaving(true);
    setStatus(null);
    setError(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("artistName", artistName);
    formData.append("fullStemsPrice", sanitizePriceInput(fullStemsPrice));
    pendingStems.forEach((stem) => {
      formData.append("stems", stem.file);
      formData.append("stemNames", stem.name);
      formData.append("stemPrices", sanitizePriceInput(stem.price));
    });

    try {
      const response = await fetch("/api/admin/stems", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { track?: Track; error?: string };

      if (!response.ok || !payload.track) {
        throw new Error(payload.error || "Stem upload failed.");
      }

      setSavedTracks((previous) => [payload.track as Track, ...previous]);
      setSelectedTrackId(payload.track.id);
      setPendingStems([]);
      setFullStemsPrice("");
      setStatus(`${payload.track.title} saved to the stem library.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Stem upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSavedStemTrack = async () => {
    if (!selectedSavedTrack) {
      setError("Choose a saved session to edit.");
      return;
    }

    setIsUpdating(true);
    setStatus(null);
    setError(null);

    const formData = new FormData();
    formData.append("trackId", selectedSavedTrack.id);
    formData.append("title", editTitle);
    formData.append("artistName", editArtistName);
    formData.append("fullStemsPrice", sanitizePriceInput(editFullStemsPrice));
    editableStems.forEach((stem) => {
      formData.append("existingStemIds", stem.id);
      formData.append("existingStemNames", stem.name);
      formData.append("existingStemPrices", sanitizePriceInput(stem.price));
    });
    pendingMissingStems.forEach((stem) => {
      formData.append("newStems", stem.file);
      formData.append("newStemNames", stem.name);
      formData.append("newStemPrices", sanitizePriceInput(stem.price));
    });

    try {
      const response = await fetch("/api/admin/stems", {
        method: "PUT",
        body: formData,
      });
      const payload = (await response.json()) as { track?: Track; error?: string };

      if (!response.ok || !payload.track) {
        throw new Error(payload.error || "Stem update failed.");
      }

      setSavedTracks((previous) =>
        previous.map((track) => (track.id === payload.track?.id ? payload.track : track)),
      );
      setSelectedTrackId(payload.track.id);
      setPendingMissingStems([]);
      setStatus(`${payload.track.title} updated.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Stem update failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section
      className={`${styles.appShell}${isDragging ? ` ${styles.appShellDragging}` : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className={styles.setupPanel}>
        <div className={styles.setupHeader}>
          <div className={styles.setupTitle}>
            <span className={styles.setupIcon} aria-hidden="true">
              <PixelIcon type="upload" size={24} color="#11100d" />
            </span>
            <div>
              <p className={styles.panelKicker}>Add To Library</p>
              <h2>New Stem Session</h2>
            </div>
          </div>

          <div className={styles.uploadActions}>
            <button
              className={styles.uploadButton}
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <PixelIcon type="upload" size={20} />
              <span>Add Audio</span>
            </button>
            <button
              className={styles.uploadButton}
              type="button"
              disabled={isSaving || !pendingStems.length}
              onClick={saveStemTrack}
            >
              <span>{isSaving ? "Saving..." : "Save To Library"}</span>
            </button>
            {pendingStems.length ? (
              <button className={styles.clearButton} type="button" onClick={clearPendingStems}>
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={fileInputRef}
          className={styles.hiddenInput}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
        />

        <div className={styles.sessionGrid}>
          <label className={styles.field}>
            <span>Session Name</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Artist</span>
            <input value={artistName} onChange={(event) => setArtistName(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Full Pack Price</span>
            <CurrencyInput
              value={fullStemsPrice}
              placeholder="20"
              ariaLabel="Full pack price"
              onChange={setFullStemsPrice}
            />
          </label>
        </div>

        <div className={styles.dropPanel}>
          <PixelIcon type="upload" size={30} />
          <span>{isDragging ? "Drop Audio" : "Drop Session Stems"}</span>
        </div>

        {status ? (
          <p className={styles.successPanel} role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className={styles.formError} role="status">
            {error}
          </p>
        ) : null}

        {pendingStems.length ? (
          <div className={styles.stemList} aria-label="Stems ready to save">
            {pendingStems.map((stem, index) => (
              <div className={styles.stemItem} key={stem.id}>
                <span
                  className={styles.stemColor}
                  style={{ backgroundColor: stem.color }}
                  aria-hidden="true"
                />
                <label className={styles.stemNameField}>
                  <span>Stem {index + 1}</span>
                  <input
                    value={stem.name}
                    onChange={(event) => updateStemName(stem.id, event.target.value)}
                  />
                </label>
                <label className={styles.stemPriceField}>
                  <span>Price</span>
                  <CurrencyInput
                    value={stem.price}
                    placeholder="5"
                    ariaLabel={`${stem.name || `Stem ${index + 1}`} price`}
                    onChange={(price) => updateStemPrice(stem.id, price)}
                  />
                </label>
                <span className={styles.fileName}>{stem.fileName}</span>
                <button
                  className={styles.removeButton}
                  type="button"
                  aria-label={`Remove ${stem.name || stem.fileName}`}
                  onClick={() => removeStem(stem.id)}
                >
                  <PixelIcon type="remove" size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <PixelIcon type="note" size={42} />
            <h2>No Upload Queued</h2>
          </div>
        )}
      </div>

      <div className={styles.playerPanel}>
        <header className={styles.savedTracksHeader}>
          <div>
            <p className={styles.playerKicker}>Stem Library</p>
            <h2>Saved Sessions</h2>
          </div>
          <strong>{savedTracks.length}</strong>
        </header>

        {savedTracks.length ? (
          <div className={styles.libraryGrid} aria-label="Saved stem sessions">
            {savedTracks.map((track) => (
              <button
                className={
                  track.id === selectedSavedTrack?.id
                    ? styles.libraryTrackButtonActive
                    : styles.libraryTrackButton
                }
                key={track.id}
                type="button"
                aria-pressed={track.id === selectedSavedTrack?.id}
                onClick={() => setSelectedTrackId(track.id)}
              >
                <span className={styles.libraryTrackCount}>{track.stems.length} stems</span>
                <strong className={styles.libraryTrackTitle}>{track.title}</strong>
                {track.artistName ? (
                  <span className={styles.libraryTrackArtist}>{track.artistName}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <PixelIcon type="note" size={42} />
            <h2>No Saved Stems</h2>
          </div>
        )}

        {selectedSavedTrack ? (
          <div className={styles.libraryPreview} aria-label="Selected saved stem session">
            <div className={styles.visualizer} data-playing="false" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} style={{ height: `${24 + ((index * 19) % 62)}%` }} />
              ))}
            </div>

            <div className={styles.libraryPreviewHeader}>
              <div>
                <p className={styles.playerKicker}>Selected Session</p>
                <h3>{selectedSavedTrack.title}</h3>
                {selectedSavedTrack.fullStemsPrice ? (
                  <p className={styles.libraryPreviewPrice}>
                    Full pack: {formatPriceLabel(selectedSavedTrack.fullStemsPrice)}
                  </p>
                ) : null}
              </div>
              <span>{selectedSavedTrack.stems.length} stems</span>
            </div>

            <div className={styles.editSessionGrid}>
              <label className={styles.field}>
                <span>Session Name</span>
                <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Artist</span>
                <input value={editArtistName} onChange={(event) => setEditArtistName(event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Full Pack Price</span>
                <CurrencyInput
                  value={editFullStemsPrice}
                  placeholder="20"
                  ariaLabel="Full pack price"
                  onChange={setEditFullStemsPrice}
                />
              </label>
            </div>

            <input
              ref={missingFileInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleMissingFileChange}
            />

            <div className={styles.editActions}>
              <button
                className={styles.uploadButton}
                type="button"
                onClick={() => missingFileInputRef.current?.click()}
              >
                <PixelIcon type="upload" size={20} />
                <span>Add Missing Stems</span>
              </button>
              <button
                className={styles.uploadButton}
                type="button"
                disabled={isUpdating}
                onClick={updateSavedStemTrack}
              >
                <span>{isUpdating ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>

            {pendingMissingStems.length ? (
              <div className={styles.stemList} aria-label="New stems to add to selected session">
                {pendingMissingStems.map((stem, index) => (
                  <div className={styles.stemItem} key={stem.id}>
                    <span
                      className={styles.stemColor}
                      style={{ backgroundColor: stem.color }}
                      aria-hidden="true"
                    />
                    <label className={styles.stemNameField}>
                      <span>New Stem {index + 1}</span>
                      <input
                        value={stem.name}
                        onChange={(event) => updateMissingStemName(stem.id, event.target.value)}
                      />
                    </label>
                    <label className={styles.stemPriceField}>
                      <span>Price</span>
                      <CurrencyInput
                        value={stem.price}
                        placeholder="5"
                        ariaLabel={`${stem.name || `New Stem ${index + 1}`} price`}
                        onChange={(price) => updateMissingStemPrice(stem.id, price)}
                      />
                    </label>
                    <span className={styles.fileName}>{stem.fileName}</span>
                    <button
                      className={styles.removeButton}
                      type="button"
                      aria-label={`Remove ${stem.name || stem.fileName}`}
                      onClick={() => removeMissingStem(stem.id)}
                    >
                      <PixelIcon type="remove" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.adminDecoderPreview}>
              <StemPlayer
                key={`admin-decoder-${selectedSavedTrack.id}`}
                track={selectedSavedTrack}
                variant="admin"
                adminStemEdits={editableStems}
                onAdminStemPriceChange={updateEditableStemPrice}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
