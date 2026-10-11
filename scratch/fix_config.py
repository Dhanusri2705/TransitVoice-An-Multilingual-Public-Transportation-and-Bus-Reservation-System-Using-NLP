with open('nlp_service/config.py', 'rb') as f:
    b = f.read()

first_pos = b.find(b'    "Udupi"')
second_pos = b.find(b'    "Udupi"', first_pos + 1)
print('first Udupi pos:', first_pos)
print('second Udupi pos:', second_pos)

cut_b = b[:first_pos] + b[second_pos:]
decoded = cut_b.decode('utf-8')
print('Decoded cleanly!')

with open('nlp_service/config.py', 'w', encoding='utf-8') as f:
    f.write(decoded)

print('Updated nlp_service/config.py')
