// Copyright 2020 Denis Treskunov

#pragma once

#include <filesystem>

class ArchiveHelper {
    public:
    void Extract(const std::string &archivePath, const std::string &outputPath, bool stripFirstComponent = true);
    virtual void onsuccess() {}
    virtual void onerror(const std::string &what) {}
};
