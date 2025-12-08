
export interface WeatherForecast {
    date: string;
    temp: number;
    condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
    chanceOfRain: number;
    description: string;
}

export const MockWeather: Record<string, WeatherForecast[]> = {
    "Nairobi": [
        { date: "Today", temp: 24, condition: "Cloudy", chanceOfRain: 20, description: "Good for planting seedlings." },
        { date: "Tomorrow", temp: 22, condition: "Rainy", chanceOfRain: 80, description: "Heavy rains expected. Delay spraying." },
        { date: "Wed", temp: 25, condition: "Sunny", chanceOfRain: 5, description: "Perfect for harvesting." }
    ],
    "Mombasa": [
        { date: "Today", temp: 30, condition: "Sunny", chanceOfRain: 10, description: "High heat. Ensure irrigation." },
        { date: "Tomorrow", temp: 29, condition: "Sunny", chanceOfRain: 10, description: "Continue irrigation." },
        { date: "Wed", temp: 28, condition: "Cloudy", chanceOfRain: 30, description: "Moderate heat." }
    ],
    "Kisumu": [
        { date: "Today", temp: 28, condition: "Rainy", chanceOfRain: 70, description: "Afternoon showers possible." },
        { date: "Tomorrow", temp: 27, condition: "Stormy", chanceOfRain: 90, description: "Keep livestock indoors." },
        { date: "Wed", temp: 26, condition: "Rainy", chanceOfRain: 60, description: "Soil moisture high." }
    ],
    "Nakuru": [
        { date: "Today", temp: 23, condition: "Cloudy", chanceOfRain: 40, description: "Moderate conditions." },
        { date: "Tomorrow", temp: 24, condition: "Sunny", chanceOfRain: 0, description: "Good for field work." },
        { date: "Wed", temp: 22, condition: "Rainy", chanceOfRain: 55, description: "Prepare for light showers." }
    ],
    "Eldoret": [
        { date: "Today", temp: 20, condition: "Rainy", chanceOfRain: 65, description: "Chilly and wet." },
        { date: "Tomorrow", temp: 21, condition: "Cloudy", chanceOfRain: 40, description: "Overcast skies." },
        { date: "Wed", temp: 19, condition: "Rainy", chanceOfRain: 80, description: "Heavy rains. Check drainage." }
    ]
};

export async function getWeatherForecast(county: string): Promise<WeatherForecast[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Normalize county name to match mock keys
    const normalizedCounty = Object.keys(MockWeather).find(k => county.toLowerCase().includes(k.toLowerCase())) || "Nairobi";

    return MockWeather[normalizedCounty];
}
