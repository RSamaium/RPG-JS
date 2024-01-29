import { AuthButton } from "../web3/wallet.js";

export function SignupPage() {
    return (
        <section className="bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="flex items-center justify-center px-4 py-10 bg-white sm:px-6 lg:px-8 sm:py-16 lg:py-24">
                    <div className="xl:w-full xl:max-w-sm 2xl:max-w-md xl:mx-auto">
                        <h2 className="text-3xl font-bold leading-tight text-black sm:text-4xl">My Rpg Game</h2>

                        <p></p>

                        <div className="mt-3 space-y-3">
                            <AuthButton />
                        </div>
                    </div>
                </div>


            </div>
        </section>

    )
}