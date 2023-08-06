
//% color=#007FBF icon="\uf017" block="RTC Uhr" weight=12
namespace rtcpcf85063tp
/* 230806
Calliope i2c Erweiterung für Grove - High Precision RTC (Real Time Clock)
optimiert und getestet für die gleichzeitige Nutzung mehrerer i2c Module am Calliope
[Projekt-URL] https://github.com/calliope-net/rtc-pcf85063tp
[README]      https://calliope-net.github.io/rtc-pcf85063tp

CMOS Real-Time Clock (RTC) - Quarz-Uhr mit Knopfzelle CR1225 3Volt
[Hardware] https://wiki.seeedstudio.com/Grove_High_Precision_RTC/
[Software] https://github.com/Seeed-Studio/Grove_High_Precision_RTC_PCF85063TP
           https://codeload.github.com/Seeed-Studio/Grove_High_Precision_RTC_PCF85063TP/zip/refs/heads/master
           https://files.seeedstudio.com/wiki/Grove-High_Precision_RTC/res/PCF85063TP.pdf

Code anhand der original Datenblätter neu programmiert von Lutz Elßner im Juli 2023
*/ {
    export enum eADDR { RTC_PCF85063TP = 0x51 }

    let lBuffer: Buffer = pins.createBuffer(7)
    let lChanges: boolean[] = [true, true, true, true, true, true, true]
    let arrayWeekday = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

    export enum eControl { Control_1 = 0, Control_2 = 1, Offset = 2, RAM_byte = 3 }
    export enum eFormat { DEC, zehner, einer, BCD }
    export enum eRegister { Sekunde = 0, Minute = 1, Stunde = 2, Tag = 3, Wochentag = 4, Monat = 5, Jahr = 6 }

    // ========== group="i2c Uhr lesen"

    //% group="i2c Uhr lesen"
    //% block="i2c %pADDR lese Datum/Zeit in internes Array" weight=90
    export function readDateTime(pADDR: eADDR) {
        write1Byte(pADDR, 4, true)
        let b = pins.i2cReadBuffer(pADDR, 7)
        for (let index = 0; index <= b.length - 1; index++) {
            lChanges.set(index, (lBuffer.getUint8(index) != b.getUint8(index)))
        }
        lBuffer = b
    }

    function write1Byte(pADDR: eADDR, byte0: number, repeat: boolean) {
        let b = pins.createBuffer(1)
        b.setUint8(0, byte0)
        pins.i2cWriteBuffer(pADDR, b, repeat)
    }


    // ========== group="Zahl (Byte)"

    //% group="Zahl (Byte)"
    //% block="%pRegister als Zahl im Format %pFormat aus Array" weight=88
    export function getByte(pRegister: eRegister, pFormat: eFormat) {
        let r = lBuffer.getUint8(pRegister)
        if (pRegister == eRegister.Sekunde && getOscillatorStop) { r = r & 0x7F }
        //if (pFormat == eFormat.DEC) { return BCDtoDEC(r) }
        if (pFormat == eFormat.DEC) { return convertByte(r, eFormat.DEC) }
        else if (pFormat == eFormat.zehner) { return convertByte(r, eFormat.zehner) }
        else if (pFormat == eFormat.einer) { return convertByte(r, eFormat.einer) }
        else { return r }
    }

    // ========== group="Text (String)"

    //% group="Text (String)"
    //% block="%pRegister als Text aus Array" weight=86
    export function getString(pRegister: eRegister) {
        if (pRegister == eRegister.Wochentag) {
            return arrayWeekday.get(getByte(pRegister, eFormat.einer))
        } else {
            return getByte(pRegister, eFormat.zehner).toString() + getByte(pRegister, eFormat.einer).toString()
        }
    }

    export enum ePart { ohne, mit }

    //% group="Text (String)"
    //% block="Zeit %bSeconds Sekunden als Text aus Array" weight=84
    //% bSeconds.defl=pcf865063tp.ePart.mit
    export function getTime(bSeconds: ePart) {
        return getString(eRegister.Stunde) + ":" +
            getString(eRegister.Minute) +
            (bSeconds == ePart.mit ? ":" + getString(eRegister.Sekunde) : "")
    }

    //% group="Text (String)"
    //% block="Datum %bWeekday Wochentag %bCentury Jahrhundert als Text aus Array" weight=82
    export function getDate(bWeekday: ePart, bCentury: ePart) {
        return (bWeekday == ePart.mit ? getString(eRegister.Wochentag) + " " : "") +
            getString(eRegister.Tag) + "." +
            getString(eRegister.Monat) + "." +
            (bCentury == ePart.mit ? "20" : "") + getString(eRegister.Jahr)
    }

    //% group="Text (String)"
    //% block="yyMMddHHmmss start %pStart length %pLength als Text aus Array" weight=80
    //% pStart.min=0 pStart.max=11 pLength.min=1 pLength.max=12 pLength.defl=12
    export function getyyMMddHHmmss(pStart: number, pLength: number) {
        return (
            getString(eRegister.Jahr) + getString(eRegister.Monat) + getString(eRegister.Tag) +
            getString(eRegister.Stunde) + getString(eRegister.Minute) + getString(eRegister.Sekunde)
        ).substr(pStart, pLength)
    }


    // ========== group="Boolean" advanced=true

    //% group="Boolean" advanced=true
    //% block="OscillatorStop / Batterie wechseln" weight=58
    export function getOscillatorStop(): boolean {
        return (lBuffer.getUint8(eRegister.Sekunde) & 0x80) != 0
    }

    //% group="Boolean" advanced=true
    //% block="%pRegister wurde im Array aktualisiert" weight=56
    export function isChanged(pRegister: eRegister) {
        return lChanges.get(pRegister)
    }


    // ========== group="i2c Zeit Register (aus Array)" advanced=true

    //% group="i2c Zeit Register (aus Array)" advanced=true
    //% block="gesamtes Array (7 Byte) [s,m,H,d,w,M,y] im Format BCD" weight=54
    export function getDateTimeArray() {
        return lBuffer.toArray(NumberFormat.UInt8LE)
    }


    // ========== group="i2c Control Register" advanced=true

    //% group="i2c Control Register" advanced=true
    //% block="i2c %pADDR writeRegister %pRegister %value" weight=48
    //% value.min=0 value.max=255
    export function writeRegister(pADDR: eADDR, pControlRegister: eControl, pByte: number) {
        let b = pins.createBuffer(2)
        b.setUint8(0, pControlRegister)
        b.setUint8(1, pByte)
        pins.i2cWriteBuffer(pADDR, b)
        //i2c.write2Byte(pADDR, pRegister, value)
    }

    //% group="i2c Control Register" advanced=true
    //% block="i2c %pADDR readRegister %pRegister" weight=46
    export function readRegister(pADDR: eADDR, pControlRegister: eControl) {
        let b = pins.createBuffer(1)
        b.setUint8(0, pControlRegister)
        pins.i2cWriteBuffer(pADDR, b, true)
        return pins.i2cReadBuffer(pADDR, 1).getUint8(0)
    }

    // ========== group="i2c Uhr stellen" advanced=true

    //% group="i2c Uhr stellen" advanced=true
    //% block="i2c %pADDR Control Register 1 und 2 initialisieren" weight=38
    export function initRegister(pADDR: eADDR) {
        // i2c.writeArray(pADDR, false, [0, 0, 0x26]) // 1.Register-Nummer, dann 2 Byte Daten
        let b = pins.createBuffer(3)
        b.setUint8(0, eControl.Control_1) // 1.Register-Nummer 0, dann 2 Byte Daten
        b.setUint8(1, 0)
        b.setUint8(2, 0x26) // minute interrupt, CLK 1 Hz
        pins.i2cWriteBuffer(pADDR, b)
    }

    //% group="i2c Uhr stellen" advanced=true
    //% block="i2c %i2cADDR setze %pRegister (und folgende) auf %values" weight=36
    export function writeDateTime(i2cADDR: eADDR, pZeitRegister: eRegister, values: number[]) {
        let b = pins.createBuffer(values.length + 1)
        b.setUint8(0, pZeitRegister + 4) // Register Address 4:Seconds 5:Minutes ... 10:Years
        for (let index = 0; index <= values.length; index++) {
            b.setUint8(index + 1, convertByte(values.get(index), eFormat.BCD))
        }
        pins.i2cWriteBuffer(i2cADDR, b)
    }

    //% group="i2c Uhr stellen" advanced=true
    //% block="i2c %i2cADDR ändere Register(0-6) %pRegister um %value" weight=34
    export function addDateTime(pADDR: eADDR, pZeitRegister: eRegister, pByte: number) {
        if (between(pZeitRegister, 0, 6)) {
            let r = convertByte(getDateTimeArray().get(pZeitRegister), eFormat.DEC) + pByte
            if (
                (pZeitRegister == eRegister.Sekunde && between(r, 0, 59))
                || (pZeitRegister == eRegister.Minute && between(r, 0, 59))
                || (pZeitRegister == eRegister.Stunde && between(r, 0, 23))
                || (pZeitRegister == eRegister.Tag && between(r, 1, 31))
                || (pZeitRegister == eRegister.Wochentag && between(r, 0, 6))
                || (pZeitRegister == eRegister.Monat && between(r, 1, 12))
                || (pZeitRegister == eRegister.Jahr && between(r, 0, 99))
            ) {
                let b = pins.createBuffer(2)
                b.setUint8(0, pZeitRegister + 4)
                b.setUint8(1, convertByte(r, eFormat.BCD))
                pins.i2cWriteBuffer(pADDR, b)
            }
        }
    }

    function between(i0: number, i1: number, i2: number): boolean { return (i0 >= i1 && i0 <= i2) }

    // ========== group="Mathematik" advanced=true

    //% group="Mathematik" advanced=true
    //% block="convertByte %pByte %pFormat" weight=22
    export function convertByte(pByte: number, pFormat: eFormat) {
        let iByte = pByte & 0xFF
        if (pFormat == eFormat.DEC) { iByte = (iByte >> 4) * 10 + iByte % 16 }
        else if (pFormat == eFormat.zehner) { iByte = iByte >> 4 }
        else if (pFormat == eFormat.einer) { iByte = iByte % 16 }
        else if (pFormat == eFormat.BCD) { iByte = Math.trunc(iByte / 10) * 16 + iByte % 10 }
        return iByte
    }

    // ========== group="25 LED Matrix als Binär-Uhr" advanced=true

    export enum e25LED { Datum, Zeit }

    //% group="25 LED Matrix als Binär-Uhr" advanced=true
    //% block="zeige %p25LED (aus Array) als Binär-Zahlen auf 25 LED Matrix" weight=16
    export function Anzeige25LED(p25LED: e25LED) {
        if (p25LED == e25LED.Datum) {
            plot25LED(0, toBinArray(getByte(eRegister.Tag, eFormat.DEC))) // x=0 Days
            plot25LED(1, []) // x=1 unplot
            plot25LED(2, toBinArray(getByte(eRegister.Monat, eFormat.DEC))) // x=2 Months
            plot25LED(3, toBinArray(getByte(eRegister.Jahr, eFormat.DEC) >> 5)) // x=3 Years 32..99
            plot25LED(4, toBinArray(getByte(eRegister.Jahr, eFormat.DEC))) // x=4 Years 00..31
        }
        else if (p25LED == e25LED.Zeit) {
            plot25LED(0, toBinArray(getByte(eRegister.Stunde, eFormat.DEC)))
            plot25LED(1, toBinArray(getByte(eRegister.Minute, eFormat.zehner)))
            plot25LED(2, toBinArray(getByte(eRegister.Minute, eFormat.einer)))
            plot25LED(3, toBinArray(getByte(eRegister.Sekunde, eFormat.zehner)))
            plot25LED(4, toBinArray(getByte(eRegister.Sekunde, eFormat.einer)))
        }
    }

    //% group="25 LED Matrix als Binär-Uhr" advanced=true
    //% block="zeige 25 LED Spalte %x Zeile %y" weight=14
    //% x.min=0 x.max=4
    export function plot25LED(x: number, y: boolean[]) {
        if (between(x, 0, 4)) {
            if (y.length > 0 && y.get(0)) { led.plot(x, 4) } else { led.unplot(x, 4) }
            if (y.length > 1 && y.get(1)) { led.plot(x, 3) } else { led.unplot(x, 3) }
            if (y.length > 2 && y.get(2)) { led.plot(x, 2) } else { led.unplot(x, 2) }
            if (y.length > 3 && y.get(3)) { led.plot(x, 1) } else { led.unplot(x, 1) }
            if (y.length > 4 && y.get(4)) { led.plot(x, 0) } else { led.unplot(x, 0) }
        }
    }

    function toBinArray(pInt: number) {
        let blist: boolean[] = []
        let bi: number = Math.trunc(pInt)
        while (bi > 0) {
            blist.push((bi % 2) == 1)
            bi = bi >> 1
        }
        return blist
    }
} // rtc-pcf85063tp.ts
