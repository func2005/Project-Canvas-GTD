export const add = (a: number, b: number) => a + b;

export const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
};
