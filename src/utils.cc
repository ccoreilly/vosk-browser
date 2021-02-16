// Copyright 2020 Denis Treskunov

#include <cstdio>
#include <filesystem>
#include <sstream>
#include <stdexcept>
#include <string>
#include <system_error>

// https://github.com/libarchive/libarchive
#include <archive.h>
#include <archive_entry.h>

// https://emscripten.org/docs/api_reference/fetch.html
#include <emscripten/fetch.h>

#include "utils.h"

#define CACHED_FILE "CACHED_FILE"
#define DOWNLOADED_FILE "DOWNLOADED_FILE"

namespace fs = std::filesystem;

static void EnsureDirectoryExists(const fs::path &path) {
    if (!fs::is_directory(path)) {
        if (fs::exists(path)) {
            throw std::runtime_error(path.string() + " exists but is not a directory");
        } else {
            fs::create_directories(path);
        }
    }
}

static int copy_data(struct archive *ar, struct archive *aw);

void ArchiveHelper::Extract(const std::string &archive_path, const std::string &_output_path, bool strip_first_component) {
    fs::path output_path(_output_path);
    try {
        EnsureDirectoryExists(output_path);
        std::printf("extracting %s to %s (strip_first_component: %s)\n", archive_path.c_str(), output_path.c_str(), strip_first_component ? "true" : "false");

        struct archive *a;
        struct archive *ext;
        struct archive_entry *entry;
        int flags;
        int r;

        /* Select which attributes we want to restore. */
        // flags = ARCHIVE_EXTRACT_TIME;
        flags = ARCHIVE_EXTRACT_PERM;
        flags |= ARCHIVE_EXTRACT_ACL;
        flags |= ARCHIVE_EXTRACT_FFLAGS;

        a = archive_read_new();
        // see https://github.com/libarchive/libarchive/blob/master/libarchive/archive_read_support_filter_all.c
        archive_read_support_filter_gzip(a);
        archive_read_support_format_all(a);
        ext = archive_write_disk_new();
        archive_write_disk_set_options(ext, flags);
        archive_write_disk_set_standard_lookup(ext);
        if ((r = archive_read_open_filename(a, archive_path.c_str(), 10240))) {
            onerror(archive_error_string(a));
            return;
        }
        for (;;) {
            r = archive_read_next_header(a, &entry);
            if (r == ARCHIVE_EOF) {
                break;
            }
            if (r < ARCHIVE_OK) {
                std::printf("archive_read_next_header warning: %s\n", archive_error_string(a));
            }
            const std::string ae_pathname_orig = archive_entry_pathname(entry);
            fs::path ae_path;
            std::string::size_type first_slash = ae_pathname_orig.find("/", 0);
            if (strip_first_component && first_slash != std::string::npos) {
                ae_path = output_path / ae_pathname_orig.substr(first_slash + 1);
            } else {
                ae_path = output_path / ae_pathname_orig;
            }
            
            std::printf("%s -> %s\n", ae_pathname_orig.c_str(), ae_path.c_str());
            archive_entry_set_pathname(entry, ae_path.c_str());
            if (r < ARCHIVE_WARN) {
                onerror(archive_error_string(a));
                return;
            }
            r = archive_write_header(ext, entry);
            if (r < ARCHIVE_OK) {
                std::printf("archive_write_header warning: %s\n", archive_error_string(ext));
            }
            else if (archive_entry_size(entry) > 0) {
                r = copy_data(a, ext);
                if (r < ARCHIVE_OK) {
                    std::printf("copy_data warning: %s\n", archive_error_string(ext));
                }
                if (r < ARCHIVE_WARN) {
                    onerror(archive_error_string(ext));
                    return;
                }
            }
            r = archive_write_finish_entry(ext);
            if (r < ARCHIVE_OK) {
                std::printf("archive_write_finish_entry warning: %s\n", archive_error_string(ext));
            }
            if (r < ARCHIVE_WARN) {
                onerror(archive_error_string(ext));
                return;
            }
        }
        archive_read_close(a);
        archive_read_free(a);
        archive_write_close(ext);
        archive_write_free(ext);
        onsuccess();
    } catch (const std::exception& e) {
        onerror(e.what());
    }
}

/* returns 0 if OK */
static int copy_data(struct archive *ar, struct archive *aw) {
    int r;
    const void *buff;
    size_t size;
    la_int64_t offset;

    for (;;) {
        r = archive_read_data_block(ar, &buff, &size, &offset);
        if (r == ARCHIVE_EOF)
            return (ARCHIVE_OK);
        if (r < ARCHIVE_OK)
            return (r);
        r = archive_write_data_block(aw, buff, size, offset);
        if (r < ARCHIVE_OK) {
            std::printf("%s\n", archive_error_string(aw));
            return (r);
        }
    }
}
