export type pzem = {
    id: number,
    voltage: number,
    current: number,
    power: number,
    frequency: number,
    power_factor: number,
    energy: number,
    va: number,
    var: number,
    created_at: Date
}

export type suhu = {
    id: number,
    temperature: number,
    created_at: Date,

    //today average
    average?: number,
    min?: number,
    max?: number
}

export type rpm = {
    id: number,
    rpm: number,
    created_at: Date
}