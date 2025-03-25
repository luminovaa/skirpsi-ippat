import service from "@/service/service"

export function getAllPzem() {
    return service({
        url: "/pzem",
        method: "get"
    })
}

export function getAveragePzemToday() {
    return service({
        url: "/pzem/today-average",
        method: "get"
    })
}

export function getLatestPzem() {
    return service({
        url: "/pzem/latest",
        method: "get"
    })
}