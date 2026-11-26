// Form models for the login and register pages.
namespace BrainBattle.ViewModels;

public class LoginViewModel
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string ReturnUrl { get; set; }
    public string Error { get; set; }
}

public class RegisterViewModel
{
    public string Username { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string Error { get; set; }
}
