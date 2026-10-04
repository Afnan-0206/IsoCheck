# CLI executable
add_executable(isocheck main.cpp)

target_link_libraries(isocheck
    PRIVATE
        isocheck_core
)
