import service from "@/service/service";

export function getAllSuhu() {
    return service({
        url: "/suhu",
        method: "get"
    })
}

export function getAverageSuhuToday() {
    return service({
        url: "/suhu/today-average",
        method: "get"
    })
}

export function getLatestSuhu() {
    return service({
        url: "/suhu/latest",
        method: "get"
    })
}