// Sample official quizzes so battles, rooms and practice work before anyone authors quizzes.
// Format of each question: (text, options, correctIndex, explanation)
namespace BrainBattle.Seed;

public record SampleQuestion(string Text, string[] Options, int CorrectIndex, string Explanation);

public record SampleQuiz(string Category, string Title, string Difficulty, SampleQuestion[] Questions);

public static class SampleQuizzes
{
    public static readonly SampleQuiz[] All =
    {
        new SampleQuiz("General Knowledge", "World Basics", "easy", new[]
        {
            new SampleQuestion("What is the largest ocean on Earth?", new[] { "Atlantic", "Indian", "Pacific", "Arctic" }, 2, "The Pacific covers about a third of the planet."),
            new SampleQuestion("How many continents are there?", new[] { "5", "6", "7", "8" }, 2, "Africa, Antarctica, Asia, Australia, Europe, North and South America."),
            new SampleQuestion("Which planet is known as the Red Planet?", new[] { "Venus", "Mars", "Jupiter", "Mercury" }, 1, "Iron oxide on its surface makes Mars look red."),
            new SampleQuestion("What is the capital of Japan?", new[] { "Osaka", "Kyoto", "Tokyo", "Seoul" }, 2, "Tokyo has been the capital since 1868."),
            new SampleQuestion("How many days are in a leap year?", new[] { "364", "365", "366", "367" }, 2, "February gets a 29th day."),
            new SampleQuestion("Which is the longest river in the world (commonly cited)?", new[] { "Amazon", "Nile", "Yangtze", "Mississippi" }, 1, "The Nile is usually listed as the longest at about 6,650 km."),
            new SampleQuestion("What colour do you get by mixing blue and yellow?", new[] { "Green", "Purple", "Orange", "Brown" }, 0, "Blue and yellow make green."),
            new SampleQuestion("Which animal is known as the King of the Jungle?", new[] { "Tiger", "Elephant", "Lion", "Leopard" }, 2, "The lion is traditionally called the King of the Jungle."),
        }),
        new SampleQuiz("Science", "Science Starter", "medium", new[]
        {
            new SampleQuestion("What is the chemical symbol for water?", new[] { "O2", "H2O", "CO2", "HO" }, 1, "Two hydrogen atoms and one oxygen atom."),
            new SampleQuestion("What gas do plants absorb from the air?", new[] { "Oxygen", "Nitrogen", "Carbon dioxide", "Helium" }, 2, "Plants use CO2 for photosynthesis."),
            new SampleQuestion("What is the speed of light (approx.)?", new[] { "300,000 km/s", "30,000 km/s", "3,000 km/s", "3,000,000 km/s" }, 0, "About 299,792 km per second."),
            new SampleQuestion("Which organ pumps blood through the body?", new[] { "Lungs", "Liver", "Heart", "Kidney" }, 2, "The heart pumps blood through the circulatory system."),
            new SampleQuestion("What is the hardest natural substance?", new[] { "Gold", "Iron", "Diamond", "Quartz" }, 2, "Diamond is the hardest naturally occurring material."),
            new SampleQuestion("Which planet has the most moons (as of recent counts)?", new[] { "Earth", "Saturn", "Mars", "Venus" }, 1, "Saturn has well over 100 confirmed moons."),
            new SampleQuestion("What is the centre of an atom called?", new[] { "Electron", "Nucleus", "Proton", "Shell" }, 1, "The nucleus holds protons and neutrons."),
            new SampleQuestion("Water boils at what temperature at sea level?", new[] { "90°C", "100°C", "110°C", "120°C" }, 1, "Pure water boils at 100°C at 1 atmosphere."),
        }),
        new SampleQuiz("Mathematics", "Quick Maths", "easy", new[]
        {
            new SampleQuestion("What is 12 × 8?", new[] { "86", "96", "108", "92" }, 1, "12 × 8 = 96."),
            new SampleQuestion("What is the square root of 144?", new[] { "10", "11", "12", "14" }, 2, "12 × 12 = 144."),
            new SampleQuestion("What is 15% of 200?", new[] { "15", "20", "30", "35" }, 2, "0.15 × 200 = 30."),
            new SampleQuestion("How many sides does a hexagon have?", new[] { "5", "6", "7", "8" }, 1, "Hexa means six."),
            new SampleQuestion("What is 7 + 6 × 2?", new[] { "26", "19", "20", "17" }, 1, "Multiplication first: 6 × 2 = 12, then 7 + 12 = 19."),
            new SampleQuestion("What is the value of π to two decimal places?", new[] { "3.12", "3.14", "3.16", "3.41" }, 1, "π ≈ 3.14159."),
            new SampleQuestion("Which is a prime number?", new[] { "21", "27", "29", "33" }, 2, "29 has no divisors other than 1 and itself."),
            new SampleQuestion("What is 2 to the power of 10?", new[] { "512", "1000", "1024", "2048" }, 2, "2^10 = 1024."),
        }),
        new SampleQuiz("Programming", "Programming Basics", "medium", new[]
        {
            new SampleQuestion("What does HTML stand for?", new[] { "HyperText Markup Language", "HighText Machine Language", "Hyperlink Text Mode Language", "Home Tool Markup Language" }, 0, "HTML is the standard markup language for web pages."),
            new SampleQuestion("Which keyword declares a constant in JavaScript?", new[] { "var", "let", "const", "static" }, 2, "`const` creates a binding that cannot be reassigned."),
            new SampleQuestion("What does MVC stand for?", new[] { "Model View Controller", "Main Visual Code", "Module Version Control", "Model Variable Class" }, 0, "MVC separates data, UI and logic."),
            new SampleQuestion("Which data structure works First In, First Out?", new[] { "Stack", "Queue", "Tree", "Graph" }, 1, "A queue removes items in the order they were added."),
            new SampleQuestion("What is the time complexity of binary search?", new[] { "O(n)", "O(n²)", "O(log n)", "O(1)" }, 2, "Each step halves the search space."),
            new SampleQuestion("Which HTTP method is usually used to create data?", new[] { "GET", "POST", "DELETE", "HEAD" }, 1, "POST sends data to create a resource."),
            new SampleQuestion("What does SQL stand for?", new[] { "Structured Query Language", "Simple Query Logic", "System Query Language", "Sequential Question Language" }, 0, "SQL is used to query relational databases."),
            new SampleQuestion("MongoDB stores data as…", new[] { "Tables", "Documents", "Spreadsheets", "Graphs only" }, 1, "MongoDB is a document database (BSON documents)."),
        }),
        new SampleQuiz("Bangladesh", "Know Bangladesh", "easy", new[]
        {
            new SampleQuestion("What is the capital of Bangladesh?", new[] { "Chattogram", "Dhaka", "Khulna", "Sylhet" }, 1, "Dhaka is the capital and largest city."),
            new SampleQuestion("When is Bangladesh Independence Day?", new[] { "16 December", "21 February", "26 March", "14 April" }, 2, "Independence was declared on 26 March 1971."),
            new SampleQuestion("When is Victory Day celebrated?", new[] { "26 March", "16 December", "15 August", "1 May" }, 1, "Victory Day marks 16 December 1971."),
            new SampleQuestion("What is the national flower of Bangladesh?", new[] { "Rose", "Shapla (water lily)", "Lotus", "Jasmine" }, 1, "The Shapla (white water lily) is the national flower."),
            new SampleQuestion("What is the currency of Bangladesh?", new[] { "Rupee", "Taka", "Dinar", "Ringgit" }, 1, "The Bangladeshi Taka (BDT)."),
            new SampleQuestion("Which is the longest natural sea beach in Bangladesh?", new[] { "Cox's Bazar", "Kuakata", "Patenga", "Inani" }, 0, "Cox's Bazar beach is about 120 km long."),
            new SampleQuestion("International Mother Language Day is on…", new[] { "21 February", "26 March", "16 December", "1 January" }, 0, "It honours the 1952 Language Movement."),
            new SampleQuestion("The Sundarbans is famous for which animal?", new[] { "Asian elephant", "Royal Bengal tiger", "Snow leopard", "Rhino" }, 1, "The Sundarbans is home to the Royal Bengal tiger."),
        }),
    };
}
