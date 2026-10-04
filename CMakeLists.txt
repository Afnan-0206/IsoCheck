cmake_minimum_required(VERSION 3.24)
project(IsoCheck
    VERSION 0.1.0
    LANGUAGES CXX
    DESCRIPTION "Black-box transactional isolation checker"
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Warnings: treat code quality seriously
add_compile_options(
    -Wall -Wextra -Wpedantic -Werror
    -Wno-unused-parameter  # Allow during early development
)

# --- Dependencies (System packages with FetchContent fallback) ---
find_package(nlohmann_json CONFIG QUIET)
find_package(GTest QUIET)

if(NOT nlohmann_json_FOUND OR NOT TARGET GTest::gtest_main)
    include(FetchContent)
    if(NOT nlohmann_json_FOUND)
        FetchContent_Declare(
            json
            GIT_REPOSITORY https://github.com/nlohmann/json.git
            GIT_TAG        v3.11.3
            GIT_SHALLOW    TRUE
        )
        FetchContent_MakeAvailable(json)
    endif()
    if(NOT TARGET GTest::gtest_main)
        FetchContent_Declare(
            googletest
            GIT_REPOSITORY https://github.com/google/googletest.git
            GIT_TAG        v1.15.2
            GIT_SHALLOW    TRUE
        )
        FetchContent_MakeAvailable(googletest)
    endif()
endif()

# --- Subdirectories ---
add_subdirectory(core)
add_subdirectory(cli)

# --- Testing ---
enable_testing()
add_subdirectory(tests)
