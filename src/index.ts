import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

interface UserActivity {
    date: string;
}

// Folder containing the CSV files
const folderPath = './csvs';

// Helper function to parse date strings
const parseDate = (dateStr: string): Date => {
    return new Date(dateStr);
};

// Helper function to extract the date portion (YYYY-MM-DD) from the timestamp
const extractDate = (dateStr: string): string => {
    return dateStr.split(' ')[0];
};

// Helper function to calculate the difference in minutes between two dates
const calculateTimeDifferenceInMinutes = (start: Date, end: Date): number => {
    const MS_PER_MINUTE = 1000 * 60;
    return (end.getTime() - start.getTime()) / MS_PER_MINUTE;
};

// Helper function to check if a user is a robot based on continuous 5-hour activity for at least 2 days
const isRobot = (dates: UserActivity[]): boolean => {
    const MINUTES_THRESHOLD = 5 * 60; // 5 hours in minutes
    const MAX_BREAK_MINUTES = 45; // Maximum allowable gap between continuous activity (45 minutes)

    // Group activities by day
    const activityByDate: { [date: string]: Date[] } = {};

    dates.forEach((activity) => {
        const dateKey = extractDate(activity.date);
        const activityTime = parseDate(activity.date);
        if (!activityByDate[dateKey]) {
            activityByDate[dateKey] = [];
        }
        activityByDate[dateKey].push(activityTime);
    });

    let daysWithEnoughActivity = 0;

    // Process each day's activities
    for (const date in activityByDate) {
        const activities = activityByDate[date].sort((a, b) => a.getTime() - b.getTime());
        let continuousMinutes = 0;
        let continuousStart: Date | null = null;

        for (let i = 0; i < activities.length - 1; i++) {
            const current = activities[i];
            const next = activities[i + 1];
            const timeDifference = calculateTimeDifferenceInMinutes(current, next);

            if (continuousStart === null) {
                continuousStart = current;
            }

            // Check if the gap is within the allowable range (45 minutes)
            if (timeDifference <= MAX_BREAK_MINUTES) {
                continuousMinutes += timeDifference;

                // If the continuous activity exceeds 5 hours, mark the day as having enough activity
                if (continuousMinutes >= MINUTES_THRESHOLD) {
                    daysWithEnoughActivity++;
                    break;
                }
            } else {
                // Reset if the gap is too large (break in continuous activity)
                continuousStart = null;
                continuousMinutes = 0;
            }
        }
    }

    // If there are 2 or more days with continuous activity exceeding 5 hours, mark as a robot
    return daysWithEnoughActivity >= 2;
};

// Function to process each CSV file
const processCsvFile = (filePath: string, userId: string) => {
    const userActivities: UserActivity[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const date = row.clickStart;
                userActivities.push({ date });
            })
            .on('end', () => {
                const robot = isRobot(userActivities);
                console.log(`User ${userId} is ${robot ? 'a robot' : 'a human'}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error processing file ${filePath}:`, err);
                reject(err);
            });
    });
};

// Function to process all CSV files in the folder
const processAllCsvFiles = async () => {
    try {
        const files = fs.readdirSync(folderPath);

        const csvFiles = files.filter(file => file.endsWith('.csv'));

        // Process each CSV file in the folder
        for (const file of csvFiles) {
            const userId = path.basename(file, '.csv');  // Extract userId from filename
            const filePath = path.join(folderPath, file);

            // Process the CSV file
            await processCsvFile(filePath, userId);
        }

    } catch (error) {
        console.error('Error reading CSV files:', error);
    }
};

// Start processing all CSV files
processAllCsvFiles();
