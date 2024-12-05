export default class Formatter {
    public static timeElapsedSince(dateString: string): string {
        const inputDate = new Date(dateString);
        const currentDate = new Date();
        const timeDifference = currentDate.getTime() - inputDate.getTime();
        const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));
        const yearsDifference = Math.floor(daysDifference / 365.25);
        const monthsDifference = Math.floor(daysDifference / 30);
        const weeksDifference = Math.floor(daysDifference / 7);

        if (yearsDifference >= 1) {
            return yearsDifference === 1 ? "1 Year" : `${yearsDifference} Years`;
        } else if (monthsDifference >= 1) {
            return monthsDifference === 1 ? "1 Month" : `${monthsDifference} Months`;
        } else if (weeksDifference >= 1) {
            return weeksDifference === 1 ? "1 Week" : `${weeksDifference} Weeks`;
        } else if (daysDifference >= 1) {
            return daysDifference === 1 ? "1 Day" : `${daysDifference} Days`;
        } else {
            return "Less than a day";
        }
    }
}