// Pure TypeScript implementation of Number to Words to avoid library issues

const VI_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const VI_UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const EN_TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const EN_UNITS = ["", "thousand", "million", "billion", "trillion"];

function readGroupVi(group: number): string {
    const output: string[] = [];
    const hundreds = Math.floor(group / 100);
    const remainder = group % 100;
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;

    if (hundreds > 0) {
        output.push(VI_DIGITS[hundreds] + " trăm");
        if (remainder === 0) return output.join(" ");
    }

    if (tens > 0) {
        if (tens === 1) {
            output.push("mười");
        } else {
            output.push(VI_DIGITS[tens] + " mươi");
        }
    } else if (hundreds > 0 && ones > 0) {
        output.push("lẻ");
    }

    if (ones > 0) {
        if (tens > 1 && ones === 1) {
            output.push("mốt");
        } else if (tens > 0 && ones === 5) {
            output.push("lăm");
        } else {
            output.push(VI_DIGITS[ones]);
        }
    }

    return output.join(" ");
}

function readNumberVi(n: number): string {
    if (n === 0) return "không";

    let str = "";
    let absN = Math.abs(n);
    let groupIndex = 0;

    while (absN > 0) {
        const group = absN % 1000;
        if (group > 0) {
            const groupText = readGroupVi(group);
            const unit = VI_UNITS[groupIndex];
            // Handle specific logic like "không trăm" if needed in strict reading, but for currency mostly OK
            // Simplification: just prepend
            str = groupText + (unit ? " " + unit : "") + (str ? " " + str : "");
        } else if (groupIndex > 0 && absN > 1000 && absN % 1000 === 0) {
            // Handle cases like 1,000,000 -> one million (group 0 is empty)
        }

        absN = Math.floor(absN / 1000);
        groupIndex++;
    }

    return str.trim();
}

function readGroupEn(group: number): string {
    const output: string[] = [];
    const hundreds = Math.floor(group / 100);
    const remainder = group % 100;

    if (hundreds > 0) {
        output.push(EN_ONES[hundreds] + " hundred");
    }

    if (remainder > 0) {
        if (remainder < 10) {
            output.push(EN_ONES[remainder]);
        } else if (remainder < 20) {
            output.push(EN_TEENS[remainder - 10]);
        } else {
            const tens = Math.floor(remainder / 10);
            const ones = remainder % 10;
            output.push(EN_TENS[tens] + (ones > 0 ? "-" + EN_ONES[ones] : ""));
        }
    }
    return output.join(" ");
}

function readNumberEn(n: number): string {
    if (n === 0) return "zero";
    let str = "";
    let absN = Math.abs(n);
    let groupIndex = 0;

    while (absN > 0) {
        const group = absN % 1000;
        if (group > 0) {
            const groupText = readGroupEn(group);
            const unit = EN_UNITS[groupIndex];
            str = groupText + (unit ? " " + unit : "") + (str ? " " + str : "");
        }
        absN = Math.floor(absN / 1000);
        groupIndex++;
    }
    return str.trim();
}

export const formatMoneyToWords = (amount: number, lang: string = "vi", currency: boolean = true): string => {
    if (isNaN(amount) || amount === null) return "";

    const shortLang = lang.split("-")[0];
    const targetLang = ["vi", "en"].includes(shortLang) ? shortLang : "vi";

    try {
        let text = "";
        if (targetLang === "vi") {
            text = readNumberVi(amount);
        } else {
            text = readNumberEn(amount);
        }

        if (!text) return "";

        const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

        if (!currency) return capitalized;

        const suffix = targetLang === "vi" ? " đồng" : " dong";
        return `${capitalized}${suffix}`;
    } catch (error: any) {
        console.error("Number reading failed:", error);
        return "";
    }
};
