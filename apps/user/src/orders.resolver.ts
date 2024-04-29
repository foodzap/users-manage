// import { Resolver } from "@nestjs/graphql";

// @Resolver ('App')
// export class OrdersResolver { 

//     constructor(
//         private commandBus: CommandBus,
//     ) {}

//     @Mutation('signup')
//     public async signup(@Body('input') input: SignUp ) {

//         try {
//             return await this.commandBus.execute( 
//                 new CreateUserCommand(input.username, 
//                    input.email, input.password));
//         } catch (errors) {
//             console.log("Caught promise rejection (validation failed). Errors: ", errors);
//         }
//     }
// }