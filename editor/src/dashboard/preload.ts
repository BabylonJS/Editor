window.addEventListener("DOMContentLoaded", () => {
    const { createDashboard } = process.env.DEBUG
        ? require("./main")
        : require("../../dashboard");

    createDashboard();
});
