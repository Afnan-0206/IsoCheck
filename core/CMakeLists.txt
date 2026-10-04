# Core library: history parsing, version inference, graph, checker
add_library(isocheck_core STATIC
    src/history.cpp
    src/version_order.cpp
    src/graph.cpp
    src/checker.cpp
)

target_include_directories(isocheck_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(isocheck_core
    PUBLIC
        nlohmann_json::nlohmann_json
)
