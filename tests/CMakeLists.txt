# Tests
add_executable(isocheck_tests
    core/test_history.cpp
    core/test_version_order.cpp
    core/test_graph.cpp
    core/test_checker.cpp
)

target_link_libraries(isocheck_tests
    PRIVATE
        isocheck_core
        GTest::gtest_main
)

# Tell tests where to find fixture files
target_compile_definitions(isocheck_tests
    PRIVATE
        FIXTURES_DIR="${CMAKE_CURRENT_SOURCE_DIR}/fixtures"
)

include(GoogleTest)
gtest_discover_tests(isocheck_tests)
