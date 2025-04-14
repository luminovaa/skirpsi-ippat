import Image from "next/image";
import { Card } from "../ui/card";

export const CoffeeImage = () => {
  
  return (
    <Card className="flex justify-center items-center py-[0.4rem] mb-4 bg-gradient-to-br bg-orange-100 dark:bg-zinc-900 shadow-md hover:shadow-lg transition-all duration-300">
      <div className="relative w-24 h-24 sm:w-32 sm:h-32">
        <Image
          src={ "/images/coffee_icon.svg"}
          alt="Coffee Icon"
          fill={true}
          className="p-2 object-contain drop-shadow-md animate-spin-slow"
        />
      </div>
    </Card>
  );
};